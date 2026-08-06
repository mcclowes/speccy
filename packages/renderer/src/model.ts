/**
 * ---
 * purpose: Parses OpenAPI input and creates the stable navigation and operation model used by the UI.
 * related:
 *   - ./types.ts - Source OpenAPI types.
 *   - ./Speccy.tsx - Renders the resulting reference model.
 * ---
 */

import { parse as parseYaml } from 'yaml';
import type { HttpMethod, OpenAPIDocument, Operation, PathItem } from './types';

export const HTTP_METHODS: HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
];

export interface OperationModel {
  id: string;
  method: HttpMethod;
  path: string;
  operation: Operation;
  pathItem: PathItem;
  tag: string;
}

export interface TagModel {
  name: string;
  description?: string;
  operations: OperationModel[];
}

export interface ReferenceModel {
  document: OpenAPIDocument;
  tags: TagModel[];
  operations: OperationModel[];
}

export function parseSpec(input: OpenAPIDocument | string): OpenAPIDocument {
  if (typeof input !== 'string') return input;

  const parsed = parseYaml(input) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The OpenAPI document must be an object.');
  }
  return parsed as OpenAPIDocument;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function createReferenceModel(document: OpenAPIDocument): ReferenceModel {
  if (!document.openapi && !document.swagger) {
    throw new Error('This does not look like an OpenAPI document. Add an openapi or swagger version.');
  }

  const declaredTags = new Map(
    (document.tags ?? [])
      .filter((tag): tag is { name: string; description?: string } => Boolean(tag.name))
      .map((tag) => [tag.name, tag.description]),
  );
  const operations: OperationModel[] = [];
  const usedIds = new Map<string, number>();

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;

      const tag = operation.tags?.[0] ?? 'Other';
      const baseId = slugify(operation.operationId ?? `${method}-${path}`) || 'operation';
      const count = usedIds.get(baseId) ?? 0;
      usedIds.set(baseId, count + 1);
      operations.push({
        id: count === 0 ? baseId : `${baseId}-${count + 1}`,
        method,
        path,
        operation,
        pathItem,
        tag,
      });
    }
  }

  const tagNames = [
    ...declaredTags.keys(),
    ...operations.map((operation) => operation.tag),
  ].filter((name, index, all) => all.indexOf(name) === index);

  const tags = tagNames
    .map((name) => ({
      name,
      description: declaredTags.get(name),
      operations: operations.filter((operation) => operation.tag === name),
    }))
    .filter((tag) => tag.operations.length > 0);

  return { document, tags, operations };
}

