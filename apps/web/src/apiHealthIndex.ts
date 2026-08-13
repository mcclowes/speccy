/**
 * ---
 * purpose: Slices large OpenAPI documents into bounded Spectral jobs, prioritizing the active Studio page.
 * related:
 *   - ./App.tsx - Runs these jobs when API health is opened.
 * ---
 */

import {
  operationsInDeclarationOrder,
  parseSpec,
  slugify,
  type OpenAPIDocument,
  type SpectralDiagnosticInput,
} from 'speccy-core';
import type { SpeccyRoute } from 'speccy-renderer';

export interface ApiHealthJob {
  id: string;
  document: () => OpenAPIDocument;
  currentPage: boolean;
  accepts: (diagnostic: SpectralDiagnosticInput) => boolean;
}

const BATCH_SIZE = 12;

function pointerSegments(ref: string) {
  if (!ref.startsWith('#/')) return [];
  return ref
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function valueAt(document: OpenAPIDocument, segments: string[]) {
  let value: unknown = document;
  for (const segment of segments) {
    if (!value || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

function setAt(
  target: Record<string, unknown>,
  segments: string[],
  value: unknown,
) {
  let cursor = target;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) cursor[segment] = value;
    else {
      const next = cursor[segment];
      cursor =
        next && typeof next === 'object' && !Array.isArray(next)
          ? (next as Record<string, unknown>)
          : ((cursor[segment] = {}) as Record<string, unknown>);
    }
  });
}

function includeReferences(
  source: OpenAPIDocument,
  target: Record<string, unknown>,
  node: unknown,
  included = new Set<string>(),
) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item) => includeReferences(source, target, item, included));
    return;
  }
  const ref = (node as { $ref?: unknown }).$ref;
  if (typeof ref === 'string' && !included.has(ref)) {
    included.add(ref);
    const segments = pointerSegments(ref);
    const value = valueAt(source, segments);
    if (segments.length && value !== undefined) {
      setAt(target, segments, value);
      includeReferences(source, target, value, included);
    }
  }
  Object.values(node).forEach((value) =>
    includeReferences(source, target, value, included),
  );
}

function shell(source: OpenAPIDocument): OpenAPIDocument {
  const {
    paths: _paths,
    webhooks: _webhooks,
    components: _components,
    ...rest
  } = source;
  return { ...rest, paths: {} };
}

function batches<T>(items: T[]) {
  return Array.from({ length: Math.ceil(items.length / BATCH_SIZE) }, (_, i) =>
    items.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
  );
}

export function createApiHealthJobs(
  input: OpenAPIDocument | string,
  route: SpeccyRoute,
): ApiHealthJob[] {
  const source = parseSpec(input);
  const usedIds = new Map<string, number>();
  const operationEntries = (
    [
      ['paths', source.paths ?? {}],
      ['webhooks', source.webhooks ?? {}],
    ] as const
  ).flatMap(([root, items]) =>
    Object.entries(items).flatMap(([path, pathItem]) =>
      operationsInDeclarationOrder(pathItem).map(([method, operation]) => {
        const rawId =
          root === 'webhooks'
            ? `webhook-${operation.operationId ?? `${method}-${path}`}`
            : (operation.operationId ?? `${method}-${path}`);
        const baseId = slugify(rawId) || 'operation';
        const count = usedIds.get(baseId) ?? 0;
        usedIds.set(baseId, count + 1);
        const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
        const tag =
          operation.tags?.[0] ??
          (root === 'webhooks' ? 'Other webhooks' : 'Other');
        return {
          root,
          path,
          method,
          operation,
          currentPage:
            route.page === 'overview' ||
            (route.page === 'operation' && route.operationId === id) ||
            (route.page === 'tag' && route.tag === slugify(tag)),
        };
      }),
    ),
  );

  const overview: ApiHealthJob = {
    id: 'overview',
    document: () => shell(source),
    currentPage: route.page === 'overview',
    accepts: (diagnostic) => {
      const root = diagnostic.path?.[0];
      return root !== 'paths' && root !== 'webhooks' && root !== 'components';
    },
  };
  const operationJobs = batches(operationEntries).map((batch, index) => {
    const locations = new Set(batch.map((item) => `${item.root}:${item.path}`));
    return {
      id: `operations-${index}`,
      document: () => {
        const document = shell(source);
        for (const item of batch) {
          const sourceItems =
            item.root === 'paths' ? source.paths : source.webhooks;
          const pathItem = sourceItems?.[item.path];
          const targetItems =
            item.root === 'paths'
              ? document.paths!
              : (document.webhooks ??= {});
          targetItems[item.path] = {
            parameters: pathItem?.parameters,
            [item.method]: item.operation,
          };
        }
        return document;
      },
      currentPage: batch.some((item) => item.currentPage),
      accepts: (diagnostic: SpectralDiagnosticInput) =>
        diagnostic.code !== 'invalid-ref' &&
        locations.has(
          `${String(diagnostic.path?.[0] ?? '')}:${String(diagnostic.path?.[1] ?? '')}`,
        ),
    };
  });
  const componentEntries = Object.entries(source.components ?? {}).flatMap(
    ([section, values]) =>
      Object.entries(values ?? {}).map(([name, value]) => ({
        section,
        name,
        value,
      })),
  );
  const componentJobs = batches(componentEntries).map((batch, index) => {
    const locations = new Set(
      batch.map((item) => `${item.section}:${item.name}`),
    );
    return {
      id: `components-${index}`,
      document: () => {
        const document = shell(source);
        for (const item of batch) {
          setAt(
            document as Record<string, unknown>,
            ['components', item.section, item.name],
            item.value,
          );
          includeReferences(
            source,
            document as Record<string, unknown>,
            item.value,
          );
        }
        return document;
      },
      currentPage:
        route.page === 'reference' &&
        batch.some((item) => item.section === route.section),
      accepts: (diagnostic: SpectralDiagnosticInput) =>
        diagnostic.path?.[0] === 'components' &&
        locations.has(
          `${String(diagnostic.path?.[1] ?? '')}:${String(diagnostic.path?.[2] ?? '')}`,
        ),
    };
  });
  const jobs = [overview, ...operationJobs, ...componentJobs];
  return [
    ...jobs.filter((job) => job.currentPage),
    ...jobs.filter((job) => !job.currentPage),
  ];
}
