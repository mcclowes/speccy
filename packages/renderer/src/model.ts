/**
 * ---
 * purpose: Parses OpenAPI input and creates the stable navigation and operation model used by the UI.
 * related:
 *   - ./types.ts - Source OpenAPI types.
 *   - ./Speccy.tsx - Renders the resulting reference model.
 * ---
 */

import { parse as parseYaml } from 'yaml';
import type { HttpMethod, MediaType, OpenAPIDocument, Operation, Parameter, PathItem, ResponseObject } from './types';

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
  source: 'path' | 'webhook';
}

export interface TagModel {
  name: string;
  description?: string;
  longDescription?: string;
  operations: OperationModel[];
}

export interface TagGroupModel {
  name: string;
  tags: TagModel[];
}

export interface ReferenceModel {
  document: OpenAPIDocument;
  tags: TagModel[];
  tagGroups: TagGroupModel[];
  operations: OperationModel[];
  webhooks: OperationModel[];
}

export function parseSpec(input: OpenAPIDocument | string): OpenAPIDocument {
  if (typeof input !== 'string') return input;

  const parsed = parseYaml(input) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The OpenAPI document must be an object.');
  }
  return parsed as OpenAPIDocument;
}

/**
 * Resolves local (#/...) $ref pointers throughout the document so consumers never see a
 * bare `{ $ref }` object. Refs that form a cycle are left unresolved at the point of
 * recursion to avoid infinite loops; everything else is inlined.
 */
export function resolveRefs(document: OpenAPIDocument): OpenAPIDocument {
  const resolved = new Map<string, unknown>();

  function schemaTitle(ref: string): string | undefined {
    const match = ref.match(/^#\/(?:components\/schemas|definitions)\/([^/]+)$/);
    return match?.[1]?.replace(/~1/g, '/').replace(/~0/g, '~');
  }

  function lookup(ref: string): unknown {
    if (!ref.startsWith('#/')) return undefined;
    const segments = ref
      .slice(2)
      .split('/')
      .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
    let node: unknown = document;
    for (const segment of segments) {
      if (!node || typeof node !== 'object') return undefined;
      node = (node as Record<string, unknown>)[segment];
    }
    return node;
  }

  function resolve(node: unknown, activeRefs: Set<string>): unknown {
    if (Array.isArray(node)) return node.map((item) => resolve(item, activeRefs));
    if (!node || typeof node !== 'object') return node;

    const ref = (node as { $ref?: unknown }).$ref;
    if (typeof ref === 'string') {
      if (activeRefs.has(ref)) return { $ref: ref };
      if (resolved.has(ref)) return resolved.get(ref);
      const target = lookup(ref);
      if (target === undefined) return node;
      const resolvedTarget = resolve(target, new Set(activeRefs).add(ref));
      const inferredTitle = schemaTitle(ref);
      const value = inferredTitle && resolvedTarget && typeof resolvedTarget === 'object' && !Array.isArray(resolvedTarget)
        ? { title: inferredTitle, ...resolvedTarget }
        : resolvedTarget;
      resolved.set(ref, value);
      return value;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      result[key] = resolve(value, activeRefs);
    }
    return result;
  }

  return resolve(document, new Set()) as OpenAPIDocument;
}

function swaggerSchema(parameter: Parameter) {
  return parameter.schema ?? {
    type: parameter.type,
    format: parameter.format,
    items: parameter.items,
    enum: parameter.enum,
  };
}

function normalizeSwaggerOperation(
  operation: Operation,
  pathParameters: Parameter[],
  document: OpenAPIDocument,
): Operation {
  const allParameters = [...pathParameters, ...(operation.parameters ?? [])];
  const body = allParameters.find((parameter) => parameter.in === 'body');
  const form = allParameters.filter((parameter) => parameter.in === 'formData');
  const parameters = (operation.parameters ?? [])
    .filter((parameter) => parameter.in !== 'body' && parameter.in !== 'formData')
    .map((parameter) => ({ ...parameter, schema: swaggerSchema(parameter) }));
  const consumes = operation.consumes ?? document.consumes ?? ['application/json'];
  let requestBody = operation.requestBody;
  if (!requestBody && body) {
    requestBody = {
      description: body.description,
      required: body.required,
      content: Object.fromEntries(consumes.map((mediaType) => [mediaType, { schema: swaggerSchema(body) }])),
    };
  } else if (!requestBody && form.length > 0) {
    requestBody = {
      content: Object.fromEntries(consumes.map((mediaType) => [mediaType, {
        schema: {
          type: 'object',
          required: form.filter((parameter) => parameter.required).map((parameter) => parameter.name).filter(Boolean) as string[],
          properties: Object.fromEntries(form.filter((parameter) => parameter.name).map((parameter) => [parameter.name as string, swaggerSchema(parameter)])),
        },
      }])),
    };
  }

  const produces = operation.produces ?? document.produces ?? ['application/json'];
  const responses = Object.fromEntries(Object.entries(operation.responses ?? {}).map(([code, response]) => {
    if (response.content || !response.schema) return [code, response];
    const content = Object.fromEntries(produces.map((mediaType) => [mediaType, {
      schema: response.schema,
      example: response.examples?.[mediaType],
    } satisfies MediaType]));
    return [code, { ...response, content } satisfies ResponseObject];
  }));

  return { ...operation, parameters, requestBody, responses };
}

/** Converts Swagger 2 fields to the OpenAPI 3-shaped model consumed by the renderer. */
export function normalizeDocument(document: OpenAPIDocument): OpenAPIDocument {
  const components = {
    ...document.components,
    schemas: { ...document.definitions, ...document.components?.schemas },
    parameters: { ...document.parameters, ...document.components?.parameters },
    responses: { ...document.responses, ...document.components?.responses },
    securitySchemes: { ...document.securityDefinitions, ...document.components?.securitySchemes },
  };
  const servers = document.servers?.length ? document.servers : document.host ? (document.schemes?.length ? document.schemes : ['https'])
    .map((scheme) => ({ url: `${scheme}://${document.host}${document.basePath ?? ''}` })) : undefined;
  const paths = Object.fromEntries(Object.entries(document.paths ?? {}).map(([path, pathItem]) => {
    const normalized: PathItem = { ...pathItem };
    normalized.parameters = (pathItem.parameters ?? []).map((parameter) => ({ ...parameter, schema: swaggerSchema(parameter) }));
    for (const method of HTTP_METHODS) {
      if (pathItem[method]) normalized[method] = normalizeSwaggerOperation(pathItem[method], pathItem.parameters ?? [], document);
    }
    return [path, normalized];
  }));
  return { ...document, servers, components, paths };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function createReferenceModel(rawDocument: OpenAPIDocument): ReferenceModel {
  if (!rawDocument.openapi && !rawDocument.swagger) {
    throw new Error('This does not look like an OpenAPI document. Add an openapi or swagger version.');
  }

  const document = normalizeDocument(resolveRefs(rawDocument));

  const declaredTags = new Map(
    (document.tags ?? [])
      .filter((tag): tag is { name: string; description?: string; 'x-longDescription'?: string } => Boolean(tag.name))
      .map((tag) => [tag.name, tag]),
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
        source: 'path',
      });
    }
  }

  const webhooks: OperationModel[] = [];
  for (const [path, pathItem] of Object.entries(document.webhooks ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      const baseId = slugify(`webhook-${operation.operationId ?? `${method}-${path}`}`) || 'webhook';
      webhooks.push({ id: baseId, method, path, operation, pathItem, tag: operation.tags?.[0] ?? 'Other webhooks', source: 'webhook' });
    }
  }

  const taggedOperations = [...operations, ...webhooks];
  const tagNames = [
    ...declaredTags.keys(),
    ...taggedOperations.map((operation) => operation.tag),
  ].filter((name, index, all) => all.indexOf(name) === index);

  let tags: TagModel[] = tagNames
    .map((name) => ({
      name,
      description: declaredTags.get(name)?.description,
      longDescription: declaredTags.get(name)?.['x-longDescription'],
      operations: taggedOperations.filter((operation) => operation.tag === name),
    }))
    .filter((tag) => tag.operations.length > 0);

  const configuredTagGroups = (document['x-tagGroups'] ?? [])
    .filter((group): group is { name: string; tags?: string[] } => Boolean(group.name));
  const tagGroups = configuredTagGroups.map((group) => ({
    name: group.name,
    tags: (group.tags ?? [])
      .map((name) => tags.find((tag) => tag.name === name))
      .filter((tag): tag is TagModel => Boolean(tag)),
  }));
  if (configuredTagGroups.length > 0) {
    const groupedTagNames = new Set(configuredTagGroups.flatMap((group) => group.tags ?? []));
    tags = tags.filter((tag) => groupedTagNames.has(tag.name) || tag.name === 'Other webhooks');
  }

  return { document, tags, tagGroups, operations, webhooks };
}
