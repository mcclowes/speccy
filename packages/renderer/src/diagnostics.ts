/**
 * ---
 * purpose: Analyzes OpenAPI documents for correctness, documentation, design, security, and compatibility problems.
 * related:
 *   - ./DeveloperDiagnostics.tsx - Presents these findings and manages local suppressions.
 *   - ./types.ts - Defines the OpenAPI source shapes inspected here.
 * ---
 */

import { operationsInDeclarationOrder } from './model';
import type { HttpMethod, OpenAPIDocument, Operation, Parameter, ResponseObject, SchemaObject, SecurityRequirement } from './types';

export type DiagnosticSeverity = 'issue' | 'warning' | 'suggestion';
export type DiagnosticSource = 'speccy' | 'spectral';
export type DiagnosticCategory = 'oas' | 'documentation' | 'operations' | 'resource-design' | 'errors' | 'authentication' | 'pagination' | 'data-modeling' | 'lifecycle' | 'change-safety';

export interface ApiDiagnostic {
  id: string;
  ruleId: string;
  source: DiagnosticSource;
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  message: string;
  rationale?: string;
  suggestion?: string;
  path: Array<string | number>;
  operationId?: string;
  tag?: string;
  range?: { start: { line: number; character: number }; end: { line: number; character: number } };
}

export interface SpectralDiagnosticInput {
  code: string | number;
  message: string;
  severity: number | DiagnosticSeverity;
  path?: Array<string | number>;
  range?: ApiDiagnostic['range'];
}

type AddDiagnostic = (diagnostic: Omit<ApiDiagnostic, 'id' | 'source'> & { source?: DiagnosticSource }) => void;

const placeholder = /^(?:todo|tbd|description|string|text|n\/?a|none|lorem ipsum)[.!]?$/i;
const collectionWords = /(?:list|search|find all|get all|collection)/i;
const mutationMethods = new Set<HttpMethod>(['post', 'put', 'patch']);
const errorCodes = /^(?:4|5|default)/;
const successCodes = /^2/;

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function operationKey(method: HttpMethod, path: string, operation: Operation) {
  return operation.operationId ?? `${method}-${path}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

function securityNames(requirements?: SecurityRequirement[]) {
  return new Set((requirements ?? []).flatMap((requirement) => Object.keys(requirement)));
}

function responseSchema(response: ResponseObject): SchemaObject | undefined {
  return response.content?.['application/json']?.schema ?? Object.values(response.content ?? {})[0]?.schema ?? response.schema;
}

function schemaSignature(schema?: SchemaObject): string {
  if (!schema) return '';
  return JSON.stringify({ type: schema.type, format: schema.format, properties: Object.keys(schema.properties ?? {}).sort(), required: [...(schema.required ?? [])].sort(), enum: schema.enum });
}

function visitSchema(schema: SchemaObject | undefined, path: Array<string | number>, add: AddDiagnostic, context: { operationId?: string; tag?: string }, seen = new Set<SchemaObject>()) {
  if (!schema || seen.has(schema)) return;
  seen.add(schema);
  const label = String(path.at(-1) ?? schema.title ?? 'schema');
  if ((schema.type === 'object' || schema.properties) && Object.keys(schema.properties ?? {}).length === 0 && schema.additionalProperties === undefined) {
    add({ ruleId: 'object-has-properties', severity: 'warning', category: 'data-modeling', message: `${label} is an empty object schema.`, rationale: 'Consumers cannot generate useful types or know which fields to expect.', suggestion: 'Declare its properties, or explicitly allow additional properties.', path, ...context });
  }
  if (schema.enum?.length && !text(schema.description)) {
    add({ ruleId: 'enum-values-documented', severity: 'suggestion', category: 'documentation', message: `${label} has undocumented enum values.`, rationale: 'A value name rarely explains the state or behavior it represents.', suggestion: 'Describe what each value means and when clients should expect it.', path, ...context });
  }
  const lower = label.toLowerCase();
  if ((lower.endsWith('at') || lower.includes('timestamp') || lower.includes('datetime')) && schema.type === 'string' && !schema.format) {
    add({ ruleId: 'timestamp-format', severity: 'warning', category: 'data-modeling', message: `${label} looks like a timestamp but has no format.`, rationale: 'Clients cannot distinguish arbitrary text from an RFC 3339 timestamp.', suggestion: 'Set `format: date-time`.', path, ...context });
  }
  if (/(?:amount|price|total|cost)$/i.test(label) && (schema.type === 'number' || schema.format === 'float' || schema.format === 'double')) {
    add({ ruleId: 'money-precision', severity: 'warning', category: 'data-modeling', message: `${label} may model money as floating point.`, rationale: 'Binary floating point can introduce rounding errors, and the currency is unclear.', suggestion: 'Use integer minor units or a decimal string, and document the currency.', path, ...context });
  }
  if (lower === 'status' && schema.enum?.some((value) => typeof value === 'string' && /^(?:pending|requires?_action)$/i.test(value))) {
    add({ ruleId: 'status-present-condition', severity: 'suggestion', category: 'lifecycle', message: `${label} includes a vague or action-oriented state.`, rationale: 'A status should describe what the resource is now, not what happened or what a user must do next.', suggestion: 'Name present conditions explicitly, and put required actions or failure reasons in a structured issue.', path, ...context });
  }
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const propertyPath = [...path, 'properties', name];
    if (!text(property.description)) add({ ruleId: 'property-description', severity: 'suggestion', category: 'documentation', message: `${name} has no description.`, rationale: 'Consumers need meaning and constraints, not only a generated type.', suggestion: 'Explain what the field represents, where it comes from, and any stability or unit constraints.', path: propertyPath, ...context });
    else if (placeholder.test(property.description.trim())) add({ ruleId: 'placeholder-description', severity: 'warning', category: 'documentation', message: `${name} still has placeholder copy.`, suggestion: 'Replace it with information a consumer can act on.', path: [...propertyPath, 'description'], ...context });
    visitSchema(property, propertyPath, add, context, seen);
  }
  visitSchema(schema.items, [...path, 'items'], add, context, seen);
  for (const keyword of ['allOf', 'oneOf', 'anyOf'] as const) schema[keyword]?.forEach((member, index) => visitSchema(member, [...path, keyword, index], add, context, seen));
  if (typeof schema.additionalProperties === 'object') visitSchema(schema.additionalProperties, [...path, 'additionalProperties'], add, context, seen);
}

function inspectParameter(parameter: Parameter, index: number, basePath: Array<string | number>, add: AddDiagnostic, context: { operationId?: string; tag?: string }) {
  const name = parameter.name ?? `parameter ${index + 1}`;
  const path = [...basePath, index];
  if (!text(parameter.description)) add({ ruleId: 'parameter-description', severity: 'suggestion', category: 'documentation', message: `${name} has no description.`, rationale: 'Its type does not explain where developers get the value or how it behaves.', suggestion: 'Explain its source, constraints, and whether it remains stable.', path, ...context });
  if (parameter.in === 'path' && parameter.required !== true) add({ ruleId: 'path-parameter-required', severity: 'issue', category: 'oas', message: `Path parameter ${name} must be required.`, suggestion: 'Set `required: true`.', path, ...context });
  visitSchema(parameter.schema, [...path, 'schema'], add, context);
}

function inspectErrors(responses: Record<string, ResponseObject>, basePath: Array<string | number>, add: AddDiagnostic, context: { operationId?: string; tag?: string }) {
  const errors = Object.entries(responses).filter(([code]) => errorCodes.test(code));
  if (errors.length === 0) {
    add({ ruleId: 'error-response', severity: 'warning', category: 'errors', message: 'No error response is documented.', rationale: 'Consumers cannot tell how this operation fails or build reliable recovery behavior.', suggestion: 'Add the likely 4xx responses and a reusable structured error schema.', path: basePath, ...context });
    return;
  }
  for (const [code, response] of errors) {
    const schema = responseSchema(response);
    if (!schema) add({ ruleId: 'structured-error-response', severity: 'warning', category: 'errors', message: `${code} has no structured error schema.`, rationale: 'A status code and prose message are not enough for programmatic handling.', suggestion: 'Return a stable machine-readable code, human-readable detail, field context where relevant, and a correlation ID.', path: [...basePath, code], ...context });
    else {
      const properties = schema.properties ?? {};
      const hasCode = ['code', 'type', 'issue', 'errorCode'].some((name) => name in properties);
      const hasCorrelation = ['correlationId', 'requestId', 'traceId'].some((name) => name in properties);
      if (!hasCode) add({ ruleId: 'machine-readable-error-code', severity: 'warning', category: 'errors', message: `${code} has no machine-readable error code.`, suggestion: 'Add a stable string code clients can branch on.', path: [...basePath, code], ...context });
      if (!hasCorrelation) add({ ruleId: 'error-correlation-id', severity: 'suggestion', category: 'errors', message: `${code} has no correlation or request ID.`, rationale: 'A shared identifier is the fastest route from a client report to server logs.', suggestion: 'Include and echo a correlation identifier.', path: [...basePath, code], ...context });
    }
  }
}

function compareDocuments(current: OpenAPIDocument, previous: OpenAPIDocument, add: AddDiagnostic) {
  for (const [path, oldPathItem] of Object.entries(previous.paths ?? {})) {
    const currentPathItem = current.paths?.[path];
    for (const [method, oldOperation] of operationsInDeclarationOrder(oldPathItem)) {
      const operationPath = ['paths', path, method];
      const nextOperation = currentPathItem?.[method];
      const context = { operationId: operationKey(method, path, oldOperation), tag: oldOperation.tags?.[0] };
      if (!nextOperation) {
        add({ ruleId: 'operation-removed', severity: 'issue', category: 'change-safety', message: `${method.toUpperCase()} ${path} was removed.`, rationale: 'Existing clients may still call this operation.', suggestion: 'Restore it, version the breaking change, or provide a migration path.', path: operationPath, ...context });
        continue;
      }
      const oldParameters = [...(oldPathItem.parameters ?? []), ...(oldOperation.parameters ?? [])];
      const nextParameters = [...(currentPathItem.parameters ?? []), ...(nextOperation.parameters ?? [])];
      for (const parameter of nextParameters.filter((item) => item.required)) {
        const old = oldParameters.find((item) => item.name === parameter.name && item.in === parameter.in);
        if (!old || !old.required) add({ ruleId: 'required-parameter-added', severity: 'issue', category: 'change-safety', message: `${parameter.name} is now required.`, rationale: 'Existing requests will fail without it.', suggestion: 'Keep it optional or introduce the requirement in a new API version.', path: [...operationPath, 'parameters'], ...context });
      }
      const oldRequestSchema = Object.values(oldOperation.requestBody?.content ?? {})[0]?.schema;
      const nextRequestSchema = Object.values(nextOperation.requestBody?.content ?? {})[0]?.schema;
      for (const name of nextRequestSchema?.required ?? []) if (!oldRequestSchema?.required?.includes(name)) add({ ruleId: 'required-request-field-added', severity: 'issue', category: 'change-safety', message: `${name} is now required in the request body.`, rationale: 'Existing request payloads will fail validation.', suggestion: 'Keep it optional or introduce the requirement in a new version.', path: [...operationPath, 'requestBody'], ...context });
      for (const [name, nextProperty] of Object.entries(nextRequestSchema?.properties ?? {})) {
        const oldEnum = oldRequestSchema?.properties?.[name]?.enum;
        if (oldEnum && nextProperty.enum && oldEnum.some((value) => !nextProperty.enum?.includes(value))) add({ ruleId: 'enum-narrowed', severity: 'issue', category: 'change-safety', message: `Accepted values for ${name} were narrowed.`, rationale: 'Existing clients may still send a removed value.', suggestion: 'Restore the value or version the contract change.', path: [...operationPath, 'requestBody', name], ...context });
      }
      for (const [code, oldResponse] of Object.entries(oldOperation.responses ?? {})) {
        const nextResponse = nextOperation.responses?.[code];
        if (!nextResponse) add({ ruleId: 'response-removed', severity: 'issue', category: 'change-safety', message: `Response ${code} was removed.`, path: [...operationPath, 'responses', code], ...context });
        else if (schemaSignature(responseSchema(oldResponse)) !== schemaSignature(responseSchema(nextResponse))) add({ ruleId: 'response-schema-changed', severity: 'warning', category: 'change-safety', message: `Response ${code} changed shape.`, rationale: 'Generated clients and deployed parsers may no longer accept it.', suggestion: 'Check the semantic diff and version incompatible changes.', path: [...operationPath, 'responses', code], ...context });
      }
      const oldSecurity = securityNames(oldOperation.security ?? previous.security);
      const nextSecurity = securityNames(nextOperation.security ?? current.security);
      if ([...nextSecurity].some((name) => !oldSecurity.has(name))) add({ ruleId: 'authentication-changed', severity: 'issue', category: 'change-safety', message: 'Authentication requirements became stricter.', suggestion: 'Treat this as a breaking change and provide a migration path.', path: [...operationPath, 'security'], ...context });
    }
  }
}

export function adaptSpectralDiagnostics(inputs: SpectralDiagnosticInput[]): ApiDiagnostic[] {
  return inputs.map((input, index) => ({
    id: `spectral:${String(input.code)}:${(input.path ?? []).join('.')}:${index}`,
    ruleId: String(input.code), source: 'spectral', severity: typeof input.severity === 'string' ? input.severity : input.severity <= 0 ? 'issue' : input.severity === 1 ? 'warning' : 'suggestion',
    category: 'oas', message: input.message, path: input.path ?? [], range: input.range,
  }));
}

export function analyzeOpenApi(document: OpenAPIDocument, options: { previousDocument?: OpenAPIDocument; spectral?: SpectralDiagnosticInput[] } = {}): ApiDiagnostic[] {
  const diagnostics: ApiDiagnostic[] = [];
  const add: AddDiagnostic = (diagnostic) => {
    const source = diagnostic.source ?? 'speccy';
    diagnostics.push({ ...diagnostic, source, id: `${source}:${diagnostic.ruleId}:${diagnostic.path.join('.')}` });
  };
  if (!text(document.info?.description)) add({ ruleId: 'api-description', severity: 'suggestion', category: 'documentation', message: 'This API has no description.', rationale: 'New consumers need to know what the API is for before reading individual operations.', suggestion: 'Describe its purpose, audience, and main concepts.', path: ['info', 'description'] });
  for (const [index, server] of (document.servers ?? []).entries()) if (!text(server.description)) add({ ruleId: 'server-description', severity: 'suggestion', category: 'documentation', message: `Server ${index + 1} has no description.`, suggestion: 'Identify the environment or audience this URL serves.', path: ['servers', index, 'description'] });
  for (const [index, tag] of (document.tags ?? []).entries()) if (tag.name && !text(tag.description)) add({ ruleId: 'tag-description', severity: 'suggestion', category: 'documentation', message: `${tag.name} has no description.`, suggestion: 'Explain the resource or capability grouped under this tag.', path: ['tags', index, 'description'], tag: tag.name });
  const declaredTags = new Map((document.tags ?? []).filter((tag) => tag.name).map((tag) => [tag.name!, tag]));
  const usedTags = new Set(Object.values(document.paths ?? {}).flatMap((pathItem) => operationsInDeclarationOrder(pathItem).flatMap(([, operation]) => operation.tags ?? [])));
  for (const tag of usedTags) if (!declaredTags.has(tag)) add({ ruleId: 'tag-description', severity: 'suggestion', category: 'documentation', message: `${tag} has no description.`, suggestion: 'Declare the tag at the document level and explain the resource or capability it groups.', path: ['tags'], tag });

  const operationIds = new Map<string, number>();
  const errorShapes = new Set<string>();
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    const placeholders = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
    if (/\/(?:create|add|update|delete|remove|get|list|search)(?:\/|$)/i.test(path)) add({ ruleId: 'noun-paths', severity: 'suggestion', category: 'resource-design', message: `${path} uses an action word in the path.`, rationale: 'HTTP methods already express the action, while paths identify resources.', suggestion: 'Prefer a noun resource path such as `POST /users`.', path: ['paths', path] });
    if (path.split('/').filter(Boolean).length > 4) add({ ruleId: 'deep-resource-path', severity: 'suggestion', category: 'resource-design', message: `${path} is deeply nested.`, rationale: 'Deep nesting couples resource access to one ownership route.', suggestion: 'Consider a top-level resource with filtering or links to its parent.', path: ['paths', path] });
    for (const [method, operation] of operationsInDeclarationOrder(pathItem)) {
      const operationPath = ['paths', path, method];
      const id = operationKey(method, path, operation);
      const tag = operation.tags?.[0];
      const context = { operationId: id, tag };
      if (!text(operation.operationId)) add({ ruleId: 'operation-id', severity: 'warning', category: 'operations', message: `${method.toUpperCase()} ${path} has no operationId.`, rationale: 'SDK generators need a stable, human-readable method name.', suggestion: 'Add a unique operationId that will remain stable.', path: [...operationPath, 'operationId'], ...context });
      else operationIds.set(operation.operationId, (operationIds.get(operation.operationId) ?? 0) + 1);
      if (!text(operation.summary)) add({ ruleId: 'operation-summary', severity: 'suggestion', category: 'documentation', message: `${method.toUpperCase()} ${path} has no summary.`, suggestion: 'Add a short verb phrase that names the operation.', path: [...operationPath, 'summary'], ...context });
      if (!text(operation.description)) add({ ruleId: 'operation-description', severity: 'suggestion', category: 'documentation', message: `${method.toUpperCase()} ${path} has no description.`, rationale: 'The summary says what it does; the description should explain behavior, constraints, and side effects.', suggestion: 'Describe what consumers need to know before calling it.', path: [...operationPath, 'description'], ...context });
      else if (placeholder.test(operation.description.trim()) || operation.description.trim().toLowerCase() === operation.summary?.trim().toLowerCase()) add({ ruleId: 'weak-operation-description', severity: 'warning', category: 'documentation', message: `${method.toUpperCase()} ${path} has an unhelpful description.`, suggestion: 'Add behavior, constraints, and side effects instead of repeating the summary.', path: [...operationPath, 'description'], ...context });
      const parameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])];
      parameters.forEach((parameter, index) => inspectParameter(parameter, index, [...operationPath, 'parameters'], add, context));
      for (const name of placeholders) if (!parameters.some((parameter) => parameter.in === 'path' && parameter.name === name)) add({ ruleId: 'path-parameter-declared', severity: 'issue', category: 'oas', message: `{${name}} is not declared as a path parameter.`, suggestion: `Declare a required path parameter named ${name}.`, path: operationPath, ...context });
      for (const parameter of parameters.filter((item) => item.in === 'path' && item.name && !placeholders.includes(item.name))) add({ ruleId: 'unused-path-parameter', severity: 'issue', category: 'oas', message: `${parameter.name} is declared but not present in ${path}.`, path: [...operationPath, 'parameters'], ...context });
      if (method === 'get' && operation.requestBody) add({ ruleId: 'get-request-body', severity: 'warning', category: 'resource-design', message: `GET ${path} has a request body.`, rationale: 'Many clients, caches, and intermediaries do not reliably support GET bodies.', suggestion: 'Move inputs to query parameters or use POST for a complex search.', path: [...operationPath, 'requestBody'], ...context });
      if (operation.requestBody) {
        if (!text(operation.requestBody.description)) add({ ruleId: 'request-body-description', severity: 'suggestion', category: 'documentation', message: 'The request body has no description.', suggestion: 'Explain what the submitted document represents and any important constraints.', path: [...operationPath, 'requestBody'], ...context });
        if (!Object.keys(operation.requestBody.content ?? {}).length) add({ ruleId: 'request-media-type', severity: 'issue', category: 'oas', message: 'The request body declares no media type.', suggestion: 'Add content such as `application/json` with a schema.', path: [...operationPath, 'requestBody', 'content'], ...context });
        for (const [mediaType, media] of Object.entries(operation.requestBody.content ?? {})) {
          if (media.example === undefined && !Object.keys(media.examples ?? {}).length && media.schema?.example === undefined) add({ ruleId: 'request-example', severity: 'suggestion', category: 'documentation', message: `${mediaType} request has no example.`, rationale: 'Examples are often the fastest way for a new consumer to make a successful request.', suggestion: 'Add a realistic example with safe placeholder data.', path: [...operationPath, 'requestBody', 'content', mediaType], ...context });
          visitSchema(media.schema, [...operationPath, 'requestBody', 'content', mediaType, 'schema'], add, context);
        }
      }
      const responses = operation.responses ?? {};
      if (!Object.keys(responses).some((code) => successCodes.test(code))) add({ ruleId: 'success-response', severity: 'issue', category: 'operations', message: 'No success response is documented.', suggestion: 'Add the expected 2xx response and its schema.', path: [...operationPath, 'responses'], ...context });
      for (const [code, response] of Object.entries(responses)) {
        if (!text(response.description)) add({ ruleId: 'response-description', severity: 'warning', category: 'documentation', message: `Response ${code} has no description.`, suggestion: 'Explain when this response occurs.', path: [...operationPath, 'responses', code], ...context });
        if (code === '204' && Object.keys(response.content ?? {}).length) add({ ruleId: 'no-content-body', severity: 'issue', category: 'oas', message: 'A 204 response must not include content.', suggestion: 'Remove the response body or use a different success status.', path: [...operationPath, 'responses', code], ...context });
        if (successCodes.test(code) && code !== '204' && !responseSchema(response)) add({ ruleId: 'success-response-schema', severity: 'warning', category: 'operations', message: `Response ${code} has no schema.`, rationale: 'Consumers cannot generate a type or know what the response contains.', suggestion: 'Declare the response media type and schema.', path: [...operationPath, 'responses', code], ...context });
        for (const [mediaType, media] of Object.entries(response.content ?? {})) {
          if (successCodes.test(code) && media.example === undefined && !Object.keys(media.examples ?? {}).length && media.schema?.example === undefined) add({ ruleId: 'response-example', severity: 'suggestion', category: 'documentation', message: `Response ${code} has no example.`, suggestion: 'Add a realistic response example.', path: [...operationPath, 'responses', code, 'content', mediaType], ...context });
          visitSchema(media.schema, [...operationPath, 'responses', code, 'content', mediaType, 'schema'], add, context);
        }
        if (errorCodes.test(code)) errorShapes.add(schemaSignature(responseSchema(response)));
      }
      inspectErrors(responses, [...operationPath, 'responses'], add, context);
      const effectiveSecurity = operation.security ?? document.security;
      if (Object.keys(document.components?.securitySchemes ?? document.securityDefinitions ?? {}).length && effectiveSecurity === undefined) add({ ruleId: 'operation-security', severity: 'warning', category: 'authentication', message: 'Authentication schemes exist, but this operation does not declare whether it requires one.', suggestion: 'Declare security globally or on this operation.', path: [...operationPath, 'security'], ...context });
      if (operation.security?.length === 0 && mutationMethods.has(method)) add({ ruleId: 'unauthenticated-mutation', severity: 'warning', category: 'authentication', message: `${method.toUpperCase()} ${path} explicitly allows unauthenticated mutation.`, suggestion: 'Confirm this is intentional and document abuse controls.', path: [...operationPath, 'security'], ...context });
      const looksCollection = method === 'get' && !/\{[^}]+\}\/?$/.test(path) && (collectionWords.test(operation.summary ?? '') || responseSchema(Object.values(responses).find((_, index) => Object.keys(responses)[index]?.startsWith('2')) ?? {})?.type === 'array');
      if (looksCollection) {
        const names = new Set(parameters.map((parameter) => parameter.name?.toLowerCase()));
        const hasPagination = ['cursor', 'offset', 'page', 'page_size', 'pagesize', 'limit'].some((name) => names.has(name));
        if (!hasPagination) add({ ruleId: 'collection-pagination', severity: 'warning', category: 'pagination', message: `${method.toUpperCase()} ${path} looks like an unpaginated collection.`, rationale: 'An unbounded response becomes slower and more expensive as data grows.', suggestion: 'Add cursor pagination for a data feed, or page/offset pagination when the UI needs random access and totals.', path: operationPath, ...context });
        if ((names.has('cursor') && (names.has('page') || names.has('offset')))) add({ ruleId: 'mixed-pagination', severity: 'warning', category: 'pagination', message: 'This operation mixes cursor and offset pagination.', suggestion: 'Choose one pagination contract and use it consistently.', path: [...operationPath, 'parameters'], ...context });
        if ((names.has('offset') || names.has('page')) && !['sort', 'order', 'order_by', 'orderby'].some((name) => names.has(name))) add({ ruleId: 'pagination-order', severity: 'suggestion', category: 'pagination', message: 'Offset pagination has no explicit ordering parameter.', rationale: 'Pages can drift or repeat when ordering is undefined.', suggestion: 'Document a stable default order, and consider exposing an order parameter.', path: [...operationPath, 'parameters'], ...context });
      }
      if (mutationMethods.has(method) && !parameters.some((parameter) => /idempotency/i.test(parameter.name ?? ''))) add({ ruleId: 'idempotency-guidance', severity: 'suggestion', category: 'operations', message: `${method.toUpperCase()} ${path} has no idempotency guidance.`, rationale: 'Clients need to know whether retrying after a timeout can duplicate work.', suggestion: 'Document retry behavior or accept an idempotency key where duplicate execution is unsafe.', path: operationPath, ...context });
      if (method === 'delete' && !/soft|async|immediate|permanent|recover/i.test(operation.description ?? '')) add({ ruleId: 'deletion-semantics', severity: 'suggestion', category: 'resource-design', message: `DELETE ${path} does not explain its deletion behavior.`, rationale: 'Consumers need to know whether deletion is immediate, recoverable, or asynchronous.', suggestion: 'Document lifecycle, retention, and repeated-delete behavior.', path: operationPath, ...context });
      if (Object.keys(responses).some((code) => code === '202') && !/status|progress|poll|callback|webhook/i.test(operation.description ?? '')) add({ ruleId: 'async-operation-progress', severity: 'warning', category: 'lifecycle', message: `${method.toUpperCase()} ${path} accepts asynchronous work without explaining how to track it.`, suggestion: 'Return or document a status resource, callback, or webhook that exposes progress and completion.', path: operationPath, ...context });
    }
  }
  for (const [operationId, count] of operationIds) if (count > 1) add({ ruleId: 'operation-id-unique', severity: 'issue', category: 'oas', message: `operationId ${operationId} is used ${count} times.`, suggestion: 'Give every operation a stable unique ID.', path: ['paths'], operationId });
  if (errorShapes.size > 1) add({ ruleId: 'consistent-error-shape', severity: 'warning', category: 'errors', message: 'Error responses use inconsistent schemas.', rationale: 'Every variation adds branching and failure modes to client code.', suggestion: 'Use one reusable error envelope across responses, callbacks, and webhooks.', path: ['components', 'schemas'] });
  for (const [name, scheme] of Object.entries(document.components?.securitySchemes ?? document.securityDefinitions ?? {})) {
    if (!text(scheme.description)) add({ ruleId: 'security-description', severity: 'warning', category: 'authentication', message: `${name} has no consumer-facing authentication instructions.`, suggestion: 'Explain how credentials are obtained, transformed, and sent.', path: ['components', 'securitySchemes', name], });
    if (scheme.type === 'apiKey' && (!text(scheme.name) || !text(scheme.in))) add({ ruleId: 'api-key-location', severity: 'issue', category: 'authentication', message: `${name} does not say where the API key is sent.`, suggestion: 'Declare both `name` and `in`.', path: ['components', 'securitySchemes', name] });
    for (const [flowName, flow] of Object.entries(scheme.flows ?? {})) for (const [scope, description] of Object.entries(flow.scopes ?? {})) if (!text(description)) add({ ruleId: 'oauth-scope-description', severity: 'warning', category: 'authentication', message: `OAuth scope ${scope} has no description.`, suggestion: 'Explain the capability this scope grants.', path: ['components', 'securitySchemes', name, 'flows', flowName, 'scopes', scope] });
  }
  for (const [name, schema] of Object.entries(document.components?.schemas ?? document.definitions ?? {})) visitSchema(schema, ['components', 'schemas', name], add, {});
  for (const [eventName, pathItem] of Object.entries(document.webhooks ?? {})) {
    if (!/[a-z0-9]+\.(?:created|updated|deleted|failed|completed|authorized|canceled)$/i.test(eventName)) add({ ruleId: 'webhook-event-name', severity: 'suggestion', category: 'lifecycle', message: `Webhook ${eventName} does not read like a past-tense event.`, rationale: 'An event names what happened, while resource status describes the present condition.', suggestion: 'Use a stable name such as `payment.created` or `payment.failed`.', path: ['webhooks', eventName] });
    for (const [method, operation] of operationsInDeclarationOrder(pathItem)) {
      const context = { operationId: operationKey(method, eventName, operation), tag: operation.tags?.[0] };
      const bodySchema = Object.values(operation.requestBody?.content ?? {})[0]?.schema;
      const properties = bodySchema?.properties ?? {};
      for (const [ruleId, candidates, label] of [
        ['webhook-event-id', ['id', 'eventId'], 'a unique event ID'],
        ['webhook-timestamp', ['createdAt', 'timestamp', 'dateTime'], 'an event timestamp'],
        ['webhook-resource-reference', ['resource', 'resourceId', 'data'], 'a resource reference or payload'],
        ['webhook-version', ['version', 'apiVersion'], 'a payload version'],
      ] as const) if (!candidates.some((name) => name in properties)) add({ ruleId, severity: ruleId === 'webhook-event-id' ? 'warning' : 'suggestion', category: 'lifecycle', message: `Webhook ${eventName} has no ${label}.`, rationale: ruleId === 'webhook-event-id' ? 'Consumers need a stable key to deduplicate retried deliveries.' : undefined, suggestion: `Add ${label} to the webhook envelope.`, path: ['webhooks', eventName, method, 'requestBody'], ...context });
    }
  }
  if (options.previousDocument) compareDocuments(document, options.previousDocument, add);
  diagnostics.push(...adaptSpectralDiagnostics(options.spectral ?? []));
  return diagnostics;
}
