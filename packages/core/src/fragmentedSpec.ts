/**
 * ---
 * purpose: Combines a set of local OpenAPI fragments into one document while preserving cross-file reference semantics.
 * related:
 *   - ./model.ts - Parses YAML fragments and resolves the rewritten local JSON pointers.
 *   - ../../../apps/macos/Sources/SpeccyMac/ContentView.swift - Collects fragment sources for the native bridge.
 * ---
 */

import type { OpenAPIDocument } from './types';
import { parseSpec } from './model';

const FRAGMENTS_KEY = 'x-speccy-fragments';

function pointerSegment(value: string) {
  return value.replace(/~/g, '~0').replace(/\//g, '~1');
}

function normalizePath(path: string) {
  const segments: string[] = [];
  for (const segment of path.replace(/\\/g, '/').split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }
  return segments.join('/');
}

function resolvePath(from: string, target: string) {
  const directory = from.includes('/') ? from.slice(0, from.lastIndexOf('/') + 1) : '';
  return normalizePath(`${directory}${target}`);
}

function rewriteRefs(node: unknown, documentPath: string, available: Set<string>): unknown {
  if (Array.isArray(node)) return node.map((item) => rewriteRefs(item, documentPath, available));
  if (!node || typeof node !== 'object') return node;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string' && value.startsWith('#')) {
      result[key] = `#/${FRAGMENTS_KEY}/${pointerSegment(documentPath)}${value.length > 1 ? `/${value.slice(1).replace(/^\//, '')}` : ''}`;
      continue;
    }
    if (key === '$ref' && typeof value === 'string') {
      const hash = value.indexOf('#');
      const file = hash === -1 ? value : value.slice(0, hash);
      const fragment = hash === -1 ? '' : value.slice(hash + 1);
      if (!/^[a-z][a-z\d+.-]*:/i.test(file)) {
        let decodedFile = file;
        try { decodedFile = decodeURIComponent(file); } catch { /* Keep malformed paths unresolved. */ }
        const target = resolvePath(documentPath, decodedFile);
        if (available.has(target)) {
          result[key] = `#/${FRAGMENTS_KEY}/${pointerSegment(target)}${fragment ? `/${fragment.replace(/^\//, '')}` : ''}`;
          continue;
        }
      }
    }
    result[key] = rewriteRefs(value, documentPath, available);
  }
  return result;
}

export function bundleFragmentedSpec(sources: Record<string, string>, entrypoint: string): OpenAPIDocument {
  const normalizedSources = Object.fromEntries(
    Object.entries(sources).map(([path, source]) => [normalizePath(path), source]),
  );
  const normalizedEntrypoint = normalizePath(entrypoint);
  if (!normalizedSources[normalizedEntrypoint]) {
    throw new Error(`The entry document ${entrypoint} wasn't included in the selected folder.`);
  }

  const available = new Set(Object.keys(normalizedSources));
  const documents = Object.fromEntries(Object.entries(normalizedSources).map(([path, source]) => [
    path,
    rewriteRefs(parseSpec(source), path, available),
  ]));
  const root = documents[normalizedEntrypoint] as OpenAPIDocument;
  return {
    ...root,
    [FRAGMENTS_KEY]: documents,
  };
}
