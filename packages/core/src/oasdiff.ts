/**
 * ---
 * purpose: Adapts oasdiff changelog JSON into Speccy's semantic diff report contract.
 * related:
 *   - ./diff.ts - Defines the report contract produced here.
 *   - ./diffSpecs.ts - Produces the same contract with the built-in comparator.
 * ---
 */

import type {
  ApiChange,
  DiffArea,
  DiffKind,
  DiffReport,
  DiffSeverity,
  DiffSourceLocation,
  DiffSpecVersion,
} from './diff';
import type { HttpMethod } from './types';

export interface OasdiffSource {
  file?: string;
  line?: number;
  column?: number;
}

export interface OasdiffChange {
  id?: string;
  text?: string;
  comment?: string;
  level: string | number;
  operation?: string;
  operationId?: string;
  path?: string;
  section?: string;
  attributes?: Record<string, unknown>;
  baseSource?: OasdiffSource;
  revisionSource?: OasdiffSource;
  fingerprint?: string;
}

export interface OasdiffAdapterOptions {
  base?: DiffSpecVersion;
  revision?: DiffSpecVersion;
  /** Resolve presentation metadata that isn't included in oasdiff's changelog JSON. */
  operationMetadata?: (
    change: OasdiffChange,
  ) => { tag?: string; location?: string[] } | undefined;
}

const HTTP_METHODS = new Set<HttpMethod>([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
]);

function severityFor(level: string | number): DiffSeverity {
  const normalized = String(level).toLocaleLowerCase();
  if (normalized === 'err' || normalized === 'error' || normalized === '1')
    return 'breaking';
  if (normalized === 'warn' || normalized === 'warning' || normalized === '2')
    return 'warning';
  if (normalized === 'info' || normalized === '3') return 'compatible';
  throw new TypeError(`Unsupported oasdiff level "${String(level)}".`);
}

function kindFor(change: OasdiffChange): DiffKind {
  const value = `${change.id ?? ''} ${change.text ?? ''}`.toLocaleLowerCase();
  if (/deprecat/.test(value)) return 'deprecated';
  if (/\b(remove|removed|deleted|delete)\b/.test(value)) return 'removed';
  if (/\b(add|added|new)\b/.test(value)) return 'added';
  return 'changed';
}

function areaFor(change: OasdiffChange): DiffArea {
  const value =
    `${change.section ?? ''} ${change.id ?? ''}`.toLocaleLowerCase();
  if (/document|description|summary|external-doc/.test(value))
    return 'documentation';
  if (/security|oauth/.test(value)) return 'security';
  if (/header/.test(value)) return 'headers';
  if (/parameter/.test(value)) return 'parameters';
  if (/request/.test(value)) return 'request-body';
  if (/response/.test(value)) return 'response-body';
  return 'operation';
}

function methodFor(operation?: string): HttpMethod | undefined {
  const normalized = operation?.toLocaleLowerCase() as HttpMethod | undefined;
  return normalized && HTTP_METHODS.has(normalized) ? normalized : undefined;
}

function sourceFor(source?: OasdiffSource): DiffSourceLocation | undefined {
  if (!source) return undefined;
  return { source: source.file, line: source.line, column: source.column };
}

function locationFor(change: OasdiffChange, method?: HttpMethod): string[] {
  if (change.path && method)
    return ['paths', change.path, method, change.section].filter(
      (value): value is string => Boolean(value),
    );
  return [change.section, change.id].filter((value): value is string =>
    Boolean(value),
  );
}

/**
 * Adapts the stable changelog output, not the lower-level `oasdiff diff` JSON.
 * Generate input with `oasdiff changelog base.yaml revision.yaml --format json`.
 */
export function adaptOasdiffChangelog(
  input: unknown,
  options: OasdiffAdapterOptions = {},
): DiffReport {
  if (!Array.isArray(input))
    throw new TypeError('oasdiff changelog JSON must be an array.');
  const changes = input.map((value, index): ApiChange => {
    if (!value || typeof value !== 'object')
      throw new TypeError(
        `oasdiff change at index ${index} must be an object.`,
      );
    const change = value as OasdiffChange;
    if (!change.id || !change.text)
      throw new TypeError(
        `oasdiff change at index ${index} must include id and text.`,
      );
    const metadata = options.operationMetadata?.(change);
    const method = methodFor(change.operation);
    const area = areaFor(change);
    return {
      id: change.fingerprint || `${change.id}-${index + 1}`,
      severity:
        area === 'documentation' ? 'documentation' : severityFor(change.level),
      kind: kindFor(change),
      method,
      path: change.path,
      operationId: change.operationId,
      tag: metadata?.tag,
      scope: { area, label: change.section || undefined },
      location: metadata?.location ?? locationFor(change, method),
      message: change.comment
        ? `${change.text} ${change.comment}`
        : change.text,
      source: {
        base: sourceFor(change.baseSource),
        revision: sourceFor(change.revisionSource),
      },
    };
  });
  return {
    base: options.base ?? {},
    revision: options.revision ?? {},
    changes,
  };
}
