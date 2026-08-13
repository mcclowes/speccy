/**
 * ---
 * purpose: Loads and resolves a complete multi-document OpenAPI description before synchronous rendering.
 * related:
 *   - ./model.ts - Resolves local references once a description is in memory.
 *   - ./fragmentedSpec.ts - Bundles an already-selected folder without performing I/O.
 * ---
 */

import { parseSpec } from './model';
import type { OpenAPIDocument } from './types';

export type OpenApiDocumentLoader = (
  uri: string,
) => Promise<OpenAPIDocument | string>;

function documentUri(uri: URL): string {
  const value = new URL(uri);
  value.hash = '';
  return value.href;
}

function pointer(document: unknown, fragment: string): unknown {
  if (!fragment) return document;
  const decoded = decodeURIComponent(fragment);
  if (decoded.startsWith('/')) {
    return decoded
      .slice(1)
      .split('/')
      .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'))
      .reduce<unknown>((node, segment) => {
        if (!node || typeof node !== 'object') return undefined;
        return (node as Record<string, unknown>)[segment];
      }, document);
  }

  const seen = new Set<object>();
  function find(node: unknown): unknown {
    if (!node || typeof node !== 'object' || seen.has(node)) return undefined;
    seen.add(node);
    const record = node as Record<string, unknown>;
    if (record.$anchor === decoded || record.$dynamicAnchor === decoded)
      return node;
    for (const value of Object.values(record)) {
      const match = find(value);
      if (match !== undefined) return match;
    }
    return undefined;
  }
  return find(document);
}

export async function resolveExternalRefs(
  entrypoint: string,
  load: OpenApiDocumentLoader,
): Promise<OpenAPIDocument> {
  const entryUri = new URL(entrypoint);
  const documents = new Map<string, OpenAPIDocument>();
  const resolved = new Map<string, unknown>();

  async function loadDocument(uri: URL): Promise<OpenAPIDocument> {
    const key = documentUri(uri);
    const cached = documents.get(key);
    if (cached) return cached;
    const source = await load(key);
    const document = parseSpec(source);
    documents.set(key, document);
    return document;
  }

  async function resolve(
    node: unknown,
    currentDocumentUri: URL,
    baseUri: URL,
    activeRefs: Set<string>,
  ): Promise<unknown> {
    if (Array.isArray(node))
      return Promise.all(
        node.map((item) =>
          resolve(item, currentDocumentUri, baseUri, activeRefs),
        ),
      );
    if (!node || typeof node !== 'object') return node;

    const record = node as Record<string, unknown>;
    const scopedBase =
      typeof record.$id === 'string' ? new URL(record.$id, baseUri) : baseUri;
    if (typeof record.$ref === 'string') {
      const absolute = new URL(record.$ref, scopedBase);
      if (
        documentUri(absolute) === documentUri(entryUri) &&
        documentUri(currentDocumentUri) === documentUri(entryUri)
      )
        return record;
      const key = absolute.href;
      const siblings = Object.fromEntries(
        Object.entries(record).filter(([name]) => name !== '$ref'),
      );
      if (activeRefs.has(key)) return { $ref: key, ...siblings };

      let target = resolved.get(key);
      if (target === undefined) {
        const targetDocumentUri = new URL(documentUri(absolute));
        const targetDocument = await loadDocument(targetDocumentUri);
        const selected = pointer(targetDocument, absolute.hash.slice(1));
        if (selected === undefined) return node;
        target = await resolve(
          selected,
          targetDocumentUri,
          targetDocumentUri,
          new Set(activeRefs).add(key),
        );
        resolved.set(key, target);
      }

      if (target && typeof target === 'object' && !Array.isArray(target)) {
        return {
          ...target,
          ...((await resolve(
            siblings,
            currentDocumentUri,
            scopedBase,
            activeRefs,
          )) as Record<string, unknown>),
        };
      }
      return target;
    }

    const result: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(record)) {
      result[name] = await resolve(
        value,
        currentDocumentUri,
        scopedBase,
        activeRefs,
      );
    }
    return result;
  }

  const entryDocument = await loadDocument(entryUri);
  return resolve(
    entryDocument,
    entryUri,
    entryUri,
    new Set(),
  ) as Promise<OpenAPIDocument>;
}
