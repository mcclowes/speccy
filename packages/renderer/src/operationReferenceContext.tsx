/**
 * ---
 * purpose: Resolves operation references against OpenAPI documents so documentation components can derive links and examples.
 * related:
 *   - ./OperationReference.tsx - Renders the resolved method, path, href, and examples.
 *   - ./operationPreviewData.ts - Derives request and response examples from the resolved operation.
 *   - ./routing.ts - Builds the reference route for an operation id.
 * ---
 */

import { createContext, useContext, type ReactNode } from 'react';
import {
  createReferenceModel,
  parseSpec,
  slugify,
  type OpenAPIDocument,
  type OperationModel,
  type ReferenceModel,
} from 'speccy-core';
import { routePath } from './routing';

export interface OperationReferenceSource {
  /** OpenAPI document, or a JSON or YAML string, that the components look operations up in. */
  spec: OpenAPIDocument | string;
  /** Route where the reference for `spec` is mounted, such as `/api`. */
  basePath?: string;
  /** Route segment placed between `basePath` and the operation id. Defaults to none. */
  operationSegment?: string;
  /** Name used to pick this source explicitly with the `api` prop. */
  name?: string;
}

/** Identifies an operation by method and path, or by operation id. */
export type OperationReferenceLookup =
  | { method: string; path: string; operationId?: string; api?: string }
  | { operationId: string; method?: string; path?: string; api?: string };

export interface ResolvedOperationReference {
  method: string;
  /** Path to display; never includes an OpenAPI `#variant` fragment. */
  path: string;
  href?: string;
  operation?: OperationModel;
}

const SourcesContext = createContext<OperationReferenceSource[]>([]);

export interface OperationReferenceProviderProps {
  /** Shorthand for a single source. */
  spec?: OpenAPIDocument | string;
  /** Base path for the shorthand `spec`. Defaults to `/api`. */
  basePath?: string;
  /** Sources searched in order when a component does not pass its own spec. */
  apis?: OperationReferenceSource[];
  children?: ReactNode;
}

/**
 * Supplies OpenAPI documents to every operation component beneath it so they
 * can derive `href` and examples without repeating `spec` on each usage.
 */
export function OperationReferenceProvider({
  spec,
  basePath,
  apis = [],
  children,
}: OperationReferenceProviderProps) {
  const inherited = useContext(SourcesContext);
  const sources = [
    ...(spec ? [{ spec, basePath }] : []),
    ...apis,
    ...inherited,
  ];
  return (
    <SourcesContext.Provider value={sources}>
      {children}
    </SourcesContext.Provider>
  );
}

const objectModels = new WeakMap<OpenAPIDocument, ReferenceModel>();
const stringModels = new Map<string, ReferenceModel>();

function modelFor(spec: OpenAPIDocument | string): ReferenceModel {
  const cache = typeof spec === 'string' ? stringModels : objectModels;
  const cached = (cache as Map<OpenAPIDocument | string, ReferenceModel>).get(
    spec,
  );
  if (cached) return cached;
  const document = parseSpec(spec);
  // Previews often receive trimmed documents; default the version so they still model.
  const model = createReferenceModel(
    document.openapi || document.swagger
      ? document
      : { openapi: '3.0.0', ...document },
  );
  (cache as Map<OpenAPIDocument | string, ReferenceModel>).set(spec, model);
  return model;
}

function stripVariant(path: string): string {
  return path.replace(/#.*$/, '');
}

function findOperation(
  items: OperationModel[],
  lookup: OperationReferenceLookup,
): OperationModel | undefined {
  if (lookup.operationId) {
    const id = lookup.operationId;
    const slug = slugify(id);
    return items.find(
      (item) =>
        item.operation.operationId === id ||
        item.id === slug ||
        item.id === `webhook-${slug}`,
    );
  }
  const method = lookup.method!.toLowerCase();
  const path = lookup.path!;
  return (
    items.find((item) => item.method === method && item.path === path) ??
    items.find(
      (item) => item.method === method && stripVariant(item.path) === path,
    )
  );
}

/**
 * Finds an operation in the given sources. Paths may carry an OpenAPI
 * `#variant` fragment (for example `/managed_cards#prepaid`) to pick one of
 * several operations declared for the same path and method.
 */
export function resolveOperationReference(
  sources: OperationReferenceSource[],
  lookup: OperationReferenceLookup,
): ResolvedOperationReference {
  const candidates = lookup.api
    ? sources.filter((source) => source.name === lookup.api)
    : sources;
  for (const source of candidates) {
    const model = modelFor(source.spec);
    const match = findOperation(
      [...model.operations, ...model.webhooks],
      lookup,
    );
    if (!match) continue;
    return {
      method: lookup.method ?? match.method,
      path: stripVariant(lookup.path ?? match.path),
      href: routePath(
        { page: 'operation', operationId: match.id },
        source.basePath ?? '/api',
        { operationSegment: source.operationSegment ?? '' },
      ),
      operation: match,
    };
  }
  return {
    method: lookup.method ?? '',
    path: lookup.path ? stripVariant(lookup.path) : '',
  };
}

export function useOperationReference(
  lookup: OperationReferenceLookup & {
    href?: string;
    spec?: OpenAPIDocument | string;
    basePath?: string;
  },
): ResolvedOperationReference {
  const inherited = useContext(SourcesContext);
  const sources = lookup.spec
    ? [{ spec: lookup.spec, basePath: lookup.basePath }, ...inherited]
    : inherited;
  const resolved = resolveOperationReference(sources, lookup);
  const href = lookup.href ?? resolved.href;
  if (
    href === undefined &&
    sources.length > 0 &&
    process.env.NODE_ENV !== 'production'
  ) {
    console.warn(
      `[speccy] Could not find operation ${
        lookup.operationId ?? `${lookup.method?.toUpperCase()} ${lookup.path}`
      } in the provided OpenAPI document${sources.length > 1 ? 's' : ''}.`,
    );
  }
  return { ...resolved, href };
}
