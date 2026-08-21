/**
 * ---
 * purpose: Compares two OpenAPI descriptions and reports what changed, and how badly.
 * related:
 *   - ./diff.ts - Defines the report contract produced here.
 *   - ./oasdiff.ts - Produces the same contract from oasdiff's changelog output.
 * ---
 */

import {
  HTTP_METHODS,
  effectiveParameters,
  normalizeDocument,
  operationsInDeclarationOrder,
  parseSpec,
} from './model';
import type {
  ApiChange,
  DiffArea,
  DiffKind,
  DiffOperation,
  DiffReport,
  DiffSeverity,
  DiffSpecVersion,
} from './diff';
import type {
  HttpMethod,
  OpenAPIDocument,
  Operation,
  Parameter,
  PathItem,
  ResponseObject,
  Schema,
  SecurityRequirement,
} from './types';

export interface DiffSpecsOptions {
  /** Overrides the version metadata derived from each document's `info` block. */
  base?: DiffSpecVersion;
  revision?: DiffSpecVersion;
}

/** Where a schema sits relative to the client, which decides whether a change helps or hurts. */
type Direction = 'request' | 'response';

interface Context {
  method?: HttpMethod;
  path?: string;
  operationId?: string;
  tag?: string;
  area: DiffArea;
  /** Set when the change originates in a reusable component rather than one operation. */
  component?: string;
}

interface Emit {
  (change: {
    ruleId: string;
    severity: DiffSeverity;
    kind: DiffKind;
    message: string;
    location: string[];
    context: Context;
    label?: string;
    before?: unknown;
    after?: unknown;
  }): void;
}

const REF_PREFIX = '#/components/schemas/';

function schemaName(ref: string | undefined) {
  return ref?.startsWith(REF_PREFIX) ? ref.slice(REF_PREFIX.length) : undefined;
}

function componentSchemas(document: OpenAPIDocument): Record<string, Schema> {
  return document.components?.schemas ?? document.definitions ?? {};
}

/** Follows `$ref` chains within one document so inline and referenced schemas compare alike. */
function dereference(
  schema: Schema | undefined,
  document: OpenAPIDocument,
  seen = new Set<string>(),
): Schema | undefined {
  if (typeof schema !== 'object' || !schema.$ref) return schema;
  const name = schemaName(schema.$ref);
  if (!name || seen.has(name)) return undefined;
  seen.add(name);
  return dereference(componentSchemas(document)[name], document, seen);
}

function bodySchema(
  container:
    | {
        content?: Record<string, { schema?: Schema }>;
        schema?: Schema;
      }
    | undefined,
): Schema | undefined {
  if (!container) return undefined;
  return (
    container.content?.['application/json']?.schema ??
    Object.values(container.content ?? {})[0]?.schema ??
    container.schema
  );
}

function parametersFor(
  pathItem: PathItem | undefined,
  operation: Operation,
): Parameter[] {
  return effectiveParameters(pathItem, operation);
}

function parameterKey(parameter: Parameter) {
  return `${parameter.in ?? 'query'}:${parameter.name ?? ''}`;
}

function securityAlternatives(
  requirements: SecurityRequirement[] | undefined,
): Set<string>[] {
  if (!requirements?.length) return [new Set()];
  return requirements.map(
    (requirement) =>
      new Set(
        Object.entries(requirement).flatMap(([scheme, scopes]) => [
          scheme,
          ...scopes.map((scope) => `${scheme}:${scope}`),
        ]),
      ),
  );
}

function includesAlternative(
  alternatives: Set<string>[],
  candidate: Set<string>,
) {
  return alternatives.some((alternative) =>
    [...alternative].every((item) => candidate.has(item)),
  );
}

function pathTemplate(path: string) {
  return path.replace(/\{[^}]*\}/g, '{}');
}

function pathParameterNames(path: string) {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1] ?? '');
}

function versionOf(document: OpenAPIDocument): DiffSpecVersion {
  return { title: document.info?.title, version: document.info?.version };
}

function describeOperation(method: HttpMethod, path: string) {
  return `${method.toUpperCase()} ${path}`;
}

/** Records which operations reach each reusable schema, so a shared change is reported once. */
interface ComponentUsage {
  operations: DiffOperation[];
  directions: Set<Direction>;
}

function componentUsage(
  document: OpenAPIDocument,
): Map<string, ComponentUsage> {
  const usage = new Map<string, ComponentUsage>();
  const schemas = componentSchemas(document);

  const collect = (node: unknown, into: Set<string>, seen: Set<unknown>) => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) collect(item, into, seen);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      // Discriminator mappings name their variants as pointers rather than as `$ref` members.
      const pointers =
        key === 'discriminator' && value && typeof value === 'object'
          ? Object.values(
              (value as { mapping?: Record<string, string> }).mapping ?? {},
            )
          : key === '$ref' && typeof value === 'string'
            ? [value]
            : [];
      let followed = false;
      for (const pointer of pointers) {
        const name = schemaName(pointer);
        if (!name || into.has(name)) continue;
        into.add(name);
        collect(schemas[name], into, seen);
        followed = true;
      }
      if (followed || pointers.length) continue;
      collect(value, into, seen);
    }
  };

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of operationsInDeclarationOrder(pathItem)) {
      const requestNames = new Set<string>();
      const responseNames = new Set<string>();
      collect(
        [...parametersFor(pathItem, operation), operation.requestBody],
        requestNames,
        new Set(),
      );
      collect(operation.responses, responseNames, new Set());
      for (const [direction, names] of [
        ['request', requestNames],
        ['response', responseNames],
      ] as const) {
        for (const name of names) {
          const entry = usage.get(name) ?? {
            operations: [],
            directions: new Set<Direction>(),
          };
          if (
            !entry.operations.some(
              (item) => item.method === method && item.path === path,
            )
          ) {
            entry.operations.push({
              method,
              path,
              operationId: operation.operationId,
              tag: operation.tags?.[0],
            });
          }
          entry.directions.add(direction);
          usage.set(name, entry);
        }
      }
    }
  }
  return usage;
}

function compareSchemas(
  before: Schema | undefined,
  after: Schema | undefined,
  baseDocument: OpenAPIDocument,
  revisionDocument: OpenAPIDocument,
  direction: Direction,
  location: string[],
  label: string,
  context: Context,
  emit: Emit,
  seen: Set<string>,
) {
  // A shared component sitting on both sides is compared once, by the component pass.
  if (
    typeof before === 'object' &&
    typeof after === 'object' &&
    before.$ref &&
    before.$ref === after.$ref
  )
    return;

  const left = dereference(before, baseDocument);
  const right = dereference(after, revisionDocument);
  if (left === undefined || right === undefined) return;

  const key = location.join('/');
  if (seen.has(key)) return;
  seen.add(key);

  if (typeof left === 'boolean' || typeof right === 'boolean') {
    if (left !== right)
      emit({
        ruleId: 'boolean-schema-changed',
        severity: 'breaking',
        kind: 'changed',
        context,
        location,
        label,
        message: `${label} changed its boolean schema constraint.`,
        before: left,
        after: right,
      });
    return;
  }

  if (left.type && right.type && left.type !== right.type) {
    emit({
      ruleId: 'field-type-changed',
      severity: 'breaking',
      kind: 'changed',
      context,
      location,
      label,
      message: `${label} changed type from ${left.type} to ${right.type}.`,
      before: left.type,
      after: right.type,
    });
  } else if (left.format !== right.format && (left.format || right.format)) {
    emit({
      ruleId: 'field-format-changed',
      severity: 'breaking',
      kind: 'changed',
      context,
      location,
      label,
      message: `${label} changed format from ${left.format ?? 'none'} to ${right.format ?? 'none'}.`,
      before: left.format,
      after: right.format,
    });
  }

  if (left.enum && right.enum) {
    const removed = left.enum.filter((value) => !right.enum?.includes(value));
    const added = right.enum.filter((value) => !left.enum?.includes(value));
    if (removed.length)
      emit(
        direction === 'request'
          ? {
              ruleId: 'request-enum-narrowed',
              severity: 'breaking',
              kind: 'changed',
              context,
              location,
              label,
              message: `${label} no longer accepts ${removed.join(', ')}.`,
              before: left.enum,
              after: right.enum,
            }
          : {
              ruleId: 'response-enum-narrowed',
              severity: 'compatible',
              kind: 'changed',
              context,
              location,
              label,
              message: `${label} no longer returns ${removed.join(', ')}.`,
              before: left.enum,
              after: right.enum,
            },
      );
    if (added.length)
      emit(
        direction === 'request'
          ? {
              ruleId: 'request-enum-widened',
              severity: 'compatible',
              kind: 'changed',
              context,
              location,
              label,
              message: `${label} also accepts ${added.join(', ')}.`,
              before: left.enum,
              after: right.enum,
            }
          : {
              ruleId: 'response-enum-widened',
              severity: 'warning',
              kind: 'changed',
              context,
              location,
              label,
              message: `${label} can now return ${added.join(', ')}, which existing clients have never seen.`,
              before: left.enum,
              after: right.enum,
            },
      );
  }

  const leftRequired = new Set(left.required ?? []);
  const rightRequired = new Set(right.required ?? []);
  const leftProperties = left.properties ?? {};
  const rightProperties = right.properties ?? {};

  for (const name of Object.keys(leftProperties)) {
    const fieldLabel = `${label}.${name}`;
    const fieldLocation = [...location, 'properties', name];
    if (!(name in rightProperties)) {
      emit(
        direction === 'request'
          ? {
              ruleId: 'request-field-removed',
              severity: 'warning',
              kind: 'removed',
              context,
              location: fieldLocation,
              label: fieldLabel,
              message: `${fieldLabel} is no longer accepted.`,
            }
          : {
              ruleId: 'response-field-removed',
              severity: 'breaking',
              kind: 'removed',
              context,
              location: fieldLocation,
              label: fieldLabel,
              message: `${fieldLabel} is no longer returned.`,
            },
      );
      continue;
    }
    if (
      direction === 'response' &&
      leftRequired.has(name) &&
      !rightRequired.has(name)
    ) {
      emit({
        ruleId: 'response-field-optional',
        severity: 'breaking',
        kind: 'changed',
        context,
        location: fieldLocation,
        label: fieldLabel,
        message: `${fieldLabel} is no longer guaranteed to be present.`,
      });
    }
    if (
      direction === 'request' &&
      !leftRequired.has(name) &&
      rightRequired.has(name)
    ) {
      emit({
        ruleId: 'request-field-required',
        severity: 'breaking',
        kind: 'changed',
        context,
        location: fieldLocation,
        label: fieldLabel,
        message: `${fieldLabel} is now required.`,
      });
    }
    compareSchemas(
      leftProperties[name],
      rightProperties[name],
      baseDocument,
      revisionDocument,
      direction,
      fieldLocation,
      fieldLabel,
      context,
      emit,
      seen,
    );
  }

  for (const name of Object.keys(rightProperties)) {
    if (name in leftProperties) continue;
    const fieldLabel = `${label}.${name}`;
    const fieldLocation = [...location, 'properties', name];
    if (direction === 'request' && rightRequired.has(name)) {
      emit({
        ruleId: 'request-field-required',
        severity: 'breaking',
        kind: 'added',
        context,
        location: fieldLocation,
        label: fieldLabel,
        message: `${fieldLabel} is now required.`,
      });
    } else {
      emit(
        direction === 'request'
          ? {
              ruleId: 'request-field-added',
              severity: 'compatible',
              kind: 'added',
              context,
              location: fieldLocation,
              label: fieldLabel,
              message: `${fieldLabel} is now accepted.`,
              after: rightProperties[name],
            }
          : {
              ruleId: 'response-field-added',
              severity: 'compatible',
              kind: 'added',
              context,
              location: fieldLocation,
              label: fieldLabel,
              message: `${fieldLabel} is now returned.`,
              after: rightProperties[name],
            },
      );
    }
  }

  compareSchemas(
    left.items,
    right.items,
    baseDocument,
    revisionDocument,
    direction,
    [...location, 'items'],
    `${label}[]`,
    context,
    emit,
    seen,
  );

  for (const keyword of ['allOf', 'oneOf', 'anyOf'] as const) {
    const leftMembers = left[keyword] ?? [];
    const rightMembers = right[keyword] ?? [];
    if (leftMembers.length !== rightMembers.length) {
      emit({
        ruleId: 'schema-composition-changed',
        severity: 'warning',
        kind: 'changed',
        context,
        location: [...location, keyword],
        label,
        message: `${label} changed from ${leftMembers.length} to ${rightMembers.length} ${keyword} members.`,
      });
    }
    const shared = Math.min(leftMembers.length, rightMembers.length);
    for (let index = 0; index < shared; index += 1) {
      compareSchemas(
        leftMembers[index],
        rightMembers[index],
        baseDocument,
        revisionDocument,
        direction,
        [...location, keyword, String(index)],
        label,
        context,
        emit,
        seen,
      );
    }
  }
}

function compareOperation(
  method: HttpMethod,
  path: string,
  basePathItem: PathItem,
  revisionPathItem: PathItem,
  baseOperation: Operation,
  revisionOperation: Operation,
  baseDocument: OpenAPIDocument,
  revisionDocument: OpenAPIDocument,
  emit: Emit,
  seen: Set<string>,
) {
  const operationId =
    revisionOperation.operationId ?? baseOperation.operationId;
  const tag = revisionOperation.tags?.[0] ?? baseOperation.tags?.[0];
  const at = (area: DiffArea): Context => ({
    method,
    path,
    operationId,
    tag,
    area,
  });
  const location = ['paths', path, method];
  const name = describeOperation(method, path);

  if (!baseOperation.deprecated && revisionOperation.deprecated) {
    emit({
      ruleId: 'operation-deprecated',
      severity: 'warning',
      kind: 'deprecated',
      context: at('operation'),
      location,
      message: `${name} is now deprecated.`,
    });
  }
  for (const field of ['summary', 'description'] as const) {
    if ((baseOperation[field] ?? '') !== (revisionOperation[field] ?? '')) {
      emit({
        ruleId: `operation-${field}-changed`,
        severity: 'documentation',
        kind: 'changed',
        context: at('documentation'),
        location: [...location, field],
        message: `The ${name} ${field} changed.`,
        before: baseOperation[field],
        after: revisionOperation[field],
      });
    }
  }

  const baseParameters = new Map(
    parametersFor(basePathItem, baseOperation).map((parameter) => [
      parameterKey(parameter),
      parameter,
    ]),
  );
  const revisionParameters = new Map(
    parametersFor(revisionPathItem, revisionOperation).map((parameter) => [
      parameterKey(parameter),
      parameter,
    ]),
  );

  for (const [key, parameter] of revisionParameters) {
    const previous = baseParameters.get(key);
    const parameterLocation = [...location, 'parameters', key];
    if (!previous) {
      if (parameter.required) {
        emit({
          ruleId: 'required-parameter-added',
          severity: 'breaking',
          kind: 'added',
          context: at('parameters'),
          location: parameterLocation,
          label: parameter.name,
          message: `${name} now requires the ${parameter.name} ${parameter.in} parameter.`,
        });
      } else {
        emit({
          ruleId: 'parameter-added',
          severity: 'compatible',
          kind: 'added',
          context: at('parameters'),
          location: parameterLocation,
          label: parameter.name,
          message: `${name} accepts a new ${parameter.name} ${parameter.in} parameter.`,
        });
      }
      continue;
    }
    if (!previous.required && parameter.required) {
      emit({
        ruleId: 'required-parameter-added',
        severity: 'breaking',
        kind: 'changed',
        context: at('parameters'),
        location: parameterLocation,
        label: parameter.name,
        message: `${parameter.name} is now a required ${parameter.in} parameter of ${name}.`,
      });
    }
    compareSchemas(
      previous.schema,
      parameter.schema,
      baseDocument,
      revisionDocument,
      'request',
      [...parameterLocation, 'schema'],
      parameter.name ?? key,
      at('parameters'),
      emit,
      seen,
    );
  }

  for (const [key, parameter] of baseParameters) {
    if (revisionParameters.has(key)) continue;
    emit({
      ruleId: 'parameter-removed',
      severity: 'breaking',
      kind: 'removed',
      context: at('parameters'),
      location: [...location, 'parameters', key],
      label: parameter.name,
      message: `${name} no longer declares the ${parameter.name} ${parameter.in} parameter.`,
    });
  }

  compareSchemas(
    bodySchema(baseOperation.requestBody),
    bodySchema(revisionOperation.requestBody),
    baseDocument,
    revisionDocument,
    'request',
    [...location, 'requestBody'],
    'The request body',
    at('request-body'),
    emit,
    seen,
  );

  const baseRequestBody = baseOperation.requestBody;
  const revisionRequestBody = revisionOperation.requestBody;
  if (!baseRequestBody && revisionRequestBody) {
    emit({
      ruleId: revisionRequestBody.required
        ? 'request-body-required'
        : 'request-body-added',
      severity: revisionRequestBody.required ? 'breaking' : 'compatible',
      kind: 'added',
      context: at('request-body'),
      location: [...location, 'requestBody'],
      message: revisionRequestBody.required
        ? `${name} now requires a request body.`
        : `${name} now accepts a request body.`,
    });
  } else if (baseRequestBody && !revisionRequestBody) {
    emit({
      ruleId: 'request-body-removed',
      severity: 'breaking',
      kind: 'removed',
      context: at('request-body'),
      location: [...location, 'requestBody'],
      message: `${name} no longer accepts a request body.`,
    });
  } else if (
    baseRequestBody &&
    revisionRequestBody &&
    !baseRequestBody.required &&
    revisionRequestBody.required
  ) {
    emit({
      ruleId: 'request-body-required',
      severity: 'breaking',
      kind: 'changed',
      context: at('request-body'),
      location: [...location, 'requestBody', 'required'],
      message: `${name} now requires a request body.`,
    });
  }

  const baseResponses = baseOperation.responses ?? {};
  const revisionResponses = revisionOperation.responses ?? {};
  for (const [code, response] of Object.entries(baseResponses)) {
    const next = revisionResponses[code];
    const responseLocation = [...location, 'responses', code];
    if (!next) {
      emit({
        ruleId: 'response-removed',
        severity: 'breaking',
        kind: 'removed',
        context: at('response-body'),
        location: responseLocation,
        label: code,
        message: `${name} no longer documents a ${code} response.`,
      });
      continue;
    }
    compareSchemas(
      bodySchema(response),
      bodySchema(next),
      baseDocument,
      revisionDocument,
      'response',
      responseLocation,
      `Response ${code}`,
      at('response-body'),
      emit,
      seen,
    );
    compareResponseHeaders(
      code,
      response,
      next,
      at('headers'),
      responseLocation,
      name,
      emit,
    );
  }
  for (const code of Object.keys(revisionResponses)) {
    if (code in baseResponses) continue;
    emit({
      ruleId: 'response-added',
      severity: 'compatible',
      kind: 'added',
      context: at('response-body'),
      location: [...location, 'responses', code],
      label: code,
      message: `${name} documents a new ${code} response.`,
    });
  }

  const baseSecurity = securityAlternatives(
    baseOperation.security ?? baseDocument.security,
  );
  const revisionSecurity = securityAlternatives(
    revisionOperation.security ?? revisionDocument.security,
  );
  const tightened = baseSecurity.some(
    (alternative) => !includesAlternative(revisionSecurity, alternative),
  );
  const relaxed = revisionSecurity.some(
    (alternative) => !includesAlternative(baseSecurity, alternative),
  );
  if (tightened) {
    emit({
      ruleId: 'security-tightened',
      severity: 'breaking',
      kind: 'changed',
      context: at('security'),
      location: [...location, 'security'],
      message: `${name} has stricter authentication requirements.`,
    });
  }
  if (relaxed) {
    emit({
      ruleId: 'security-relaxed',
      severity: 'compatible',
      kind: 'changed',
      context: at('security'),
      location: [...location, 'security'],
      message: `${name} has less restrictive authentication requirements.`,
    });
  }
}

function compareResponseHeaders(
  code: string,
  before: ResponseObject,
  after: ResponseObject,
  context: Context,
  location: string[],
  name: string,
  emit: Emit,
) {
  for (const header of Object.keys(before.headers ?? {})) {
    if (after.headers && header in after.headers) continue;
    emit({
      ruleId: 'response-header-removed',
      severity: 'breaking',
      kind: 'removed',
      context,
      location: [...location, 'headers', header],
      label: header,
      message: `${name} no longer returns the ${header} header on ${code}.`,
    });
  }
  for (const header of Object.keys(after.headers ?? {})) {
    if (before.headers && header in before.headers) continue;
    emit({
      ruleId: 'response-header-added',
      severity: 'compatible',
      kind: 'added',
      context,
      location: [...location, 'headers', header],
      label: header,
      message: `${name} returns a new ${header} header on ${code}.`,
    });
  }
}

function compareServers(
  base: OpenAPIDocument,
  revision: OpenAPIDocument,
  emit: Emit,
) {
  const context: Context = { area: 'operation' };
  const baseUrls = (base.servers ?? [])
    .map((server) => server.url)
    .filter((url): url is string => Boolean(url));
  const revisionUrls = new Set(
    (revision.servers ?? []).map((server) => server.url),
  );
  for (const url of baseUrls) {
    if (revisionUrls.has(url)) continue;
    emit({
      ruleId: 'server-removed',
      severity: 'breaking',
      kind: 'removed',
      context,
      location: ['servers', url],
      label: url,
      message: `The ${url} server is gone.`,
    });
  }
  const baseSet = new Set(baseUrls);
  for (const url of revisionUrls) {
    if (!url || baseSet.has(url)) continue;
    emit({
      ruleId: 'server-added',
      severity: 'compatible',
      kind: 'added',
      context,
      location: ['servers', url],
      label: url,
      message: `${url} is a new server.`,
    });
  }
}

function compareComponents(
  base: OpenAPIDocument,
  revision: OpenAPIDocument,
  usage: Map<string, ComponentUsage>,
  emit: Emit,
  seen: Set<string>,
) {
  const baseSchemas = componentSchemas(base);
  const revisionSchemas = componentSchemas(revision);
  for (const [name, schema] of Object.entries(baseSchemas)) {
    const next = revisionSchemas[name];
    if (!next) continue;
    const directions =
      usage.get(name)?.directions ?? new Set<Direction>(['response']);
    for (const direction of directions) {
      const context: Context = {
        area: direction === 'request' ? 'request-body' : 'response-body',
        component: name,
      };
      compareSchemas(
        schema,
        next,
        base,
        revision,
        direction,
        ['components', 'schemas', name],
        name,
        context,
        emit,
        new Set(),
      );
    }
    seen.add(['components', 'schemas', name].join('/'));
  }
}

/** Matches operations across a path rename so one rename does not read as a removal plus an addition. */
function pairPaths(base: OpenAPIDocument, revision: OpenAPIDocument) {
  const basePaths = Object.keys(base.paths ?? {});
  const revisionPaths = Object.keys(revision.paths ?? {});
  const pairs: Array<{
    basePath?: string;
    revisionPath?: string;
    renamed?: boolean;
  }> = [];
  const claimed = new Set<string>();

  for (const path of basePaths) {
    if (revisionPaths.includes(path)) {
      pairs.push({ basePath: path, revisionPath: path });
      claimed.add(path);
      continue;
    }
    const template = pathTemplate(path);
    const match = revisionPaths.find(
      (candidate) =>
        !claimed.has(candidate) &&
        !basePaths.includes(candidate) &&
        pathTemplate(candidate) === template,
    );
    if (match) {
      claimed.add(match);
      pairs.push({ basePath: path, revisionPath: match, renamed: true });
    } else {
      pairs.push({ basePath: path });
    }
  }
  for (const path of revisionPaths) {
    if (!claimed.has(path) && !basePaths.includes(path))
      pairs.push({ revisionPath: path });
  }
  return pairs;
}

export function diffSpecs(
  base: OpenAPIDocument | string,
  revision: OpenAPIDocument | string,
  options: DiffSpecsOptions = {},
): DiffReport {
  const baseDocument = normalizeDocument(parseSpec(base));
  const revisionDocument = normalizeDocument(parseSpec(revision));
  const usage = componentUsage(revisionDocument);
  const changes: ApiChange[] = [];
  const seen = new Set<string>();
  const ids = new Set<string>();

  const emit: Emit = ({
    ruleId,
    severity,
    kind,
    message,
    location,
    context,
    label,
    before,
    after,
  }) => {
    let id = `${ruleId}:${location.join('/')}`;
    for (let suffix = 2; ids.has(id); suffix += 1)
      id = `${ruleId}:${location.join('/')}#${suffix}`;
    ids.add(id);
    changes.push({
      id,
      severity,
      kind,
      message,
      location,
      method: context.method,
      path: context.path,
      operationId: context.operationId,
      tag: context.tag,
      scope: { area: context.area, ...(label ? { label } : {}) },
      ...(context.component
        ? { affectedOperations: usage.get(context.component)?.operations ?? [] }
        : {}),
      ...(before === undefined ? {} : { before }),
      ...(after === undefined ? {} : { after }),
    });
  };

  compareServers(baseDocument, revisionDocument, emit);
  compareComponents(baseDocument, revisionDocument, usage, emit, seen);

  for (const { basePath, revisionPath, renamed } of pairPaths(
    baseDocument,
    revisionDocument,
  )) {
    const basePathItem = basePath ? baseDocument.paths?.[basePath] : undefined;
    const revisionPathItem = revisionPath
      ? revisionDocument.paths?.[revisionPath]
      : undefined;

    if (renamed && basePath && revisionPath) {
      const before = pathParameterNames(basePath);
      const after = pathParameterNames(revisionPath);
      const context: Context = { path: revisionPath, area: 'parameters' };
      emit({
        ruleId: 'path-parameter-renamed',
        severity: 'breaking',
        kind: 'changed',
        context,
        location: ['paths', revisionPath],
        message: `${basePath} became ${revisionPath}.`,
        before,
        after,
      });
    }

    if (basePathItem && !revisionPathItem) {
      for (const [method, operation] of operationsInDeclarationOrder(
        basePathItem,
      )) {
        emit({
          ruleId: 'operation-removed',
          severity: 'breaking',
          kind: 'removed',
          location: ['paths', basePath!, method],
          context: {
            method,
            path: basePath,
            operationId: operation.operationId,
            tag: operation.tags?.[0],
            area: 'operation',
          },
          message: `${describeOperation(method, basePath!)} was removed.`,
        });
      }
      continue;
    }
    if (revisionPathItem && !basePathItem) {
      for (const [method, operation] of operationsInDeclarationOrder(
        revisionPathItem,
      )) {
        emit({
          ruleId: 'operation-added',
          severity: 'compatible',
          kind: 'added',
          location: ['paths', revisionPath!, method],
          context: {
            method,
            path: revisionPath,
            operationId: operation.operationId,
            tag: operation.tags?.[0],
            area: 'operation',
          },
          message: `${describeOperation(method, revisionPath!)} is new.`,
        });
      }
      continue;
    }
    if (!basePathItem || !revisionPathItem) continue;

    for (const method of HTTP_METHODS) {
      const baseOperation = basePathItem[method];
      const revisionOperation = revisionPathItem[method];
      if (baseOperation && !revisionOperation) {
        emit({
          ruleId: 'operation-removed',
          severity: 'breaking',
          kind: 'removed',
          location: ['paths', basePath!, method],
          context: {
            method,
            path: basePath,
            operationId: baseOperation.operationId,
            tag: baseOperation.tags?.[0],
            area: 'operation',
          },
          message: `${describeOperation(method, basePath!)} was removed.`,
        });
      } else if (revisionOperation && !baseOperation) {
        emit({
          ruleId: 'operation-added',
          severity: 'compatible',
          kind: 'added',
          location: ['paths', revisionPath!, method],
          context: {
            method,
            path: revisionPath,
            operationId: revisionOperation.operationId,
            tag: revisionOperation.tags?.[0],
            area: 'operation',
          },
          message: `${describeOperation(method, revisionPath!)} is new.`,
        });
      } else if (baseOperation && revisionOperation) {
        compareOperation(
          method,
          revisionPath!,
          basePathItem,
          revisionPathItem,
          baseOperation,
          revisionOperation,
          baseDocument,
          revisionDocument,
          emit,
          seen,
        );
      }
    }
  }

  return {
    base: { ...versionOf(baseDocument), ...options.base },
    revision: { ...versionOf(revisionDocument), ...options.revision },
    changes,
  };
}
