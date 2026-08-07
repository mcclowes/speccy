/**
 * ---
 * purpose: Renders a complete, searchable OpenAPI reference from the normalized model.
 * related:
 *   - ./model.ts - Parses input and builds tag and operation groups.
 *   - ./styles.css - Owns the visual system and responsive layout.
 *   - ./types.ts - Declares the public component API.
 * ---
 */

import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CodeBlock, CopyButton } from './CodeBlock';
import { DeveloperDiagnostics, InlineDiagnostics } from './DeveloperDiagnostics';
import { analyzeOpenApi } from './diagnostics';
import { EyeIcon } from './EyeIcon';
import { Markdown } from './Markdown';
import { createReferenceModel, operationsInDeclarationOrder, parseSpec, slugify, type OperationModel, type TagModel } from './model';
import { OpenApiDownload } from './OpenApiDownload';
import { componentAnchorId, DocumentReference, ReferenceNavigation, REFERENCE_GROUPS, type ReferenceKey } from './ReferenceSections';
import { RequestSample } from './RequestSample';
import { JsonValue, MediaContent, SchemaView } from './SchemaView';
import { SendIcon } from './SendIcon';
import type {
  MediaType,
  Parameter,
  OpenAPIDocument,
  ResponseObject,
  SchemaObject,
  SecurityRequirement,
  SecurityScheme,
  SpeccyProps,
  SpeccyRoute,
} from './types';
import { ThemeToggle, type Theme } from './ThemeToggle';
import { useLocalState } from './useLocalState';
import { WebhookIcon } from './WebhookIcon';

const METHOD_LABELS: Record<string, string> = {
  get: 'GET', post: 'POST', put: 'PUT', patch: 'PATCH', delete: 'DELETE',
  options: 'OPTIONS', head: 'HEAD', trace: 'TRACE',
};

const HTTP_STATUS_PHRASES: Record<string, string> = {
  100: 'Continue', 101: 'Switching Protocols', 102: 'Processing', 103: 'Early Hints', 104: 'Upload Resumption Supported',
  200: 'OK', 201: 'Created', 202: 'Accepted', 203: 'Non-Authoritative Information', 204: 'No Content', 205: 'Reset Content', 206: 'Partial Content', 207: 'Multi-Status', 208: 'Already Reported', 226: 'IM Used',
  300: 'Multiple Choices', 301: 'Moved Permanently', 302: 'Found', 303: 'See Other', 304: 'Not Modified', 305: 'Use Proxy', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
  400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 406: 'Not Acceptable', 407: 'Proxy Authentication Required', 408: 'Request Timeout', 409: 'Conflict', 410: 'Gone', 411: 'Length Required', 412: 'Precondition Failed', 413: 'Content Too Large', 414: 'URI Too Long', 415: 'Unsupported Media Type', 416: 'Range Not Satisfiable', 417: 'Expectation Failed', 421: 'Misdirected Request', 422: 'Unprocessable Content', 423: 'Locked', 424: 'Failed Dependency', 425: 'Too Early', 426: 'Upgrade Required', 428: 'Precondition Required', 429: 'Too Many Requests', 431: 'Request Header Fields Too Large', 451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout', 505: 'HTTP Version Not Supported', 506: 'Variant Also Negotiates', 507: 'Insufficient Storage', 508: 'Loop Detected', 511: 'Network Authentication Required',
};

function operationTitle(item: OperationModel): string {
  return item.operation.summary ?? item.operation.operationId ?? (item.source === 'webhook' ? item.path : 'Untitled operation');
}

function OperationBadge({ item, compact = false }: { item: OperationModel; compact?: boolean }) {
  if (item.source === 'webhook') {
    return <span className={compact ? 'sp-nav-method sp-webhook' : 'sp-method sp-webhook'} title="Webhook"><WebhookIcon /><span className="sp-visually-hidden">Webhook</span></span>;
  }
  return <span className={compact ? `sp-nav-method sp-nav-method-${item.method}` : `sp-method sp-method-${item.method}`}>{METHOD_LABELS[item.method]}</span>;
}

function Path({ value, className }: { value: string; className?: string }) {
  const parts = value.split(/(\{[^{}]+\})/g);
  return (
    <code className={className}>
      {parts.map((part, index) => part.startsWith('{') && part.endsWith('}')
        ? <span className="sp-path-parameter" key={`${part}-${index}`}>{part}</span>
        : part)}
    </code>
  );
}

function ParameterList({ parameters }: { parameters: Parameter[] }) {
  if (parameters.length === 0) return null;
  return (
    <section className="sp-section">
      <h4>Parameters</h4>
      <div className="sp-parameter-list">
        {parameters.map((parameter, index) => (
          <div className="sp-parameter" key={`${parameter.in}-${parameter.name}-${index}`}>
            <div className="sp-parameter-name">
              <code>{parameter.name ?? 'unnamed'}</code>
              <span>{parameter.in ?? 'query'}</span>
              {parameter.required && <span className="sp-required" title="Required">*</span>}
            </div>
            <Markdown>{parameter.description}</Markdown>
            <SchemaView schema={parameter.schema} />
            {parameter.example !== undefined && <JsonValue value={parameter.example} />}
          </div>
        ))}
      </div>
    </section>
  );
}

function firstMedia(content?: Record<string, MediaType>): [string, MediaType] | undefined {
  return content ? Object.entries(content)[0] : undefined;
}

function RequestBodyView({ operation }: { operation: OperationModel['operation'] }) {
  const body = operation.requestBody;
  if (!body) return null;
  return (
    <section className="sp-section">
      <h4>Request body {body.required && <span className="sp-required" title="Required">*</span>}</h4>
      <Markdown>{body.description}</Markdown>
      <MediaContent content={body.content} />
    </section>
  );
}

function ResponseView({ code, response }: { code: string; response: ResponseObject }) {
  const [open, setOpen] = useState(code.startsWith('2'));
  return (
    <div className="sp-response">
      <button type="button" className="sp-response-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={`sp-status ${code.startsWith('2') ? 'is-success' : ''}`}>{code}</span>
        <span>Response</span>
        <span className="sp-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="sp-response-body">
          <Markdown>{response.description}</Markdown>
          {response.headers && <div className="sp-detail-list"><strong>Headers</strong>{Object.entries(response.headers).map(([name, header]) => <div key={name}><code>{name}</code><Markdown>{header.description}</Markdown><SchemaView schema={header.schema} /></div>)}</div>}
          <MediaContent content={response.content} collapseObjects />
          {response.links && <div className="sp-detail-list"><strong>Links</strong>{Object.entries(response.links).map(([name, link]) => <div key={name}><code>{name}</code><Markdown>{link.description}</Markdown><span>{link.operationId ?? link.operationRef}</span></div>)}</div>}
        </div>
      )}
    </div>
  );
}

function securitySchemeLabel(scheme?: SecurityScheme): string | undefined {
  if (!scheme?.type) return undefined;
  if (scheme.type === 'apiKey') return 'API key';
  if (scheme.type === 'oauth2') return 'OAuth 2';
  if (scheme.type === 'openIdConnect') return 'OpenID Connect';
  if (scheme.type === 'http' && scheme.scheme) return scheme.scheme === 'basic' ? 'Basic' : scheme.scheme.charAt(0).toUpperCase() + scheme.scheme.slice(1);
  return scheme.type;
}

function securityRequirementLabel(requirement: SecurityRequirement, schemes?: Record<string, SecurityScheme>): string {
  return Object.keys(requirement)
    .map((name) => securitySchemeLabel(schemes?.[name]) ?? name)
    .join(' + ');
}

function SecurityRequirements({ requirements, schemes }: {
  requirements?: SecurityRequirement[];
  schemes?: Record<string, SecurityScheme>;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!requirements) return null;
  if (requirements.length === 0) return <section className="sp-section"><h4>Authorization</h4><p>Public endpoint</p></section>;
  const entries = requirements.flatMap((requirement) => Object.entries(requirement));
  const onlyEntry = entries.length === 1 ? entries[0] : undefined;
  const onlyScheme = onlyEntry ? schemes?.[onlyEntry[0]] : undefined;
  return <section className="sp-section sp-security-section"><h4 className="sp-security-heading"><button
    type="button"
    className="sp-security-toggle"
    aria-expanded={expanded}
    onClick={() => setExpanded(!expanded)}
  ><svg className="sp-security-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg><span>Authorization{onlyScheme && `: ${securitySchemeLabel(onlyScheme) ?? onlyEntry?.[0]}`}</span><span className="sp-security-info" data-tooltip={expanded ? 'Hide authorization details' : 'Show authorization details'} aria-hidden="true">?</span></button></h4>{expanded && <div className="sp-security-requirements">{requirements.map((requirement, index) => (
    <div className="sp-security-option" key={index}>{index > 0 && <span className="sp-security-operator">or</span>}<div>{Object.entries(requirement).map(([name, scopes], schemeIndex) => {
      const scheme = schemes?.[name];
      return <div className="sp-security-scheme" key={name}>
        {schemeIndex > 0 && <span className="sp-security-operator">and</span>}
        {!onlyScheme && <span><code>{securitySchemeLabel(scheme) ?? name}</code>{scopes.length > 0 && ` - ${scopes.join(', ')}`}</span>}
        <Markdown>{scheme?.description}</Markdown>
      </div>;
    })}</div></div>
  ))}</div>}</section>;
}

function CodeSample({ item, server }: { item: OperationModel; server: string }) {
  const url = `${server.replace(/\/$/, '')}${item.path}`;
  const contentType = firstMedia(item.operation.requestBody?.content)?.[0];
  const request = { method: METHOD_LABELS[item.method] ?? item.method.toUpperCase(), url, headers: contentType ? [`Content-Type: ${contentType}`] : [] };
  return (
    <aside className="sp-code-panel">
      <RequestSample request={request} storageKey="speccy:request-language" />
    </aside>
  );
}

const PARAMETER_GROUP_LABELS: Record<string, string> = {
  path: 'Path parameters',
  query: 'Query parameters',
  header: 'Header parameters',
  cookie: 'Cookie parameters',
};

const DEFAULT_VISIBLE_PARAMETERS = 5;
const MIN_COLLAPSIBLE_OPTIONAL_PARAMETERS = 3;

function ParameterCard({ location, parameter, index }: { location: string; parameter: Parameter; index: number }) {
  return <div className="sp-endpoint-parameter" key={`${location}-${parameter.name}-${index}`}>
    <div className="sp-parameter-name">
      <code>{parameter.name ?? 'unnamed'}</code>
      <SchemaView schema={parameter.schema} showExample={false} summaryOnly />
      {parameter.required && <span className="sp-required" title="Required">*</span>}
    </div>
    <Markdown>{parameter.description}</Markdown>
    {(parameter.example !== undefined || parameter.schema?.example !== undefined) && (
      <JsonValue value={parameter.example !== undefined ? parameter.example : parameter.schema?.example} />
    )}
  </div>;
}

function ParameterGroup({ location, items, parameterPrototype = false }: { location: string; items: Parameter[]; parameterPrototype?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const requiredItems = items.filter((parameter) => parameter.required);
  const optionalItems = items.filter((parameter) => !parameter.required);
  const collapsible = items.length > DEFAULT_VISIBLE_PARAMETERS;
  const visibleItems = expanded ? items : items.slice(0, DEFAULT_VISIBLE_PARAMETERS);
  const hiddenCount = items.length - visibleItems.length;

  if (parameterPrototype) {
    return (
      <section className="sp-endpoint-section sp-parameter-prototype">
        <h2>{PARAMETER_GROUP_LABELS[location] ?? 'Parameters'} <span className="sp-section-count">{items.length}</span></h2>
        {requiredItems.length > 0 && <div className="sp-endpoint-parameters">{requiredItems.map((parameter, index) => <ParameterCard location={location} parameter={parameter} index={index} key={`${location}-${parameter.name}-${index}`} />)}</div>}
        {optionalItems.length > 0 && optionalItems.length < MIN_COLLAPSIBLE_OPTIONAL_PARAMETERS && (
          <div className="sp-endpoint-parameters">{optionalItems.map((parameter, index) => <ParameterCard location={location} parameter={parameter} index={index} key={`${location}-${parameter.name}-${index}`} />)}</div>
        )}
        {optionalItems.length >= MIN_COLLAPSIBLE_OPTIONAL_PARAMETERS && <div className="sp-optional-parameter-docs">
          <button type="button" className="sp-optional-parameter-summary" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
            <span><strong>Optional {location} parameters</strong><small>Pagination, filtering, sorting, and related data</small></span>
            <span>{optionalItems.length}<i className="sp-chevron" aria-hidden="true" /></span>
          </button>
          {expanded && <div className="sp-endpoint-parameters">{optionalItems.map((parameter, index) => <ParameterCard location={location} parameter={parameter} index={index} key={`${location}-${parameter.name}-${index}`} />)}</div>}
        </div>}
      </section>
    );
  }

  return (
    <section className="sp-endpoint-section">
      <h2>{PARAMETER_GROUP_LABELS[location] ?? 'Parameters'} <span className="sp-section-count">{items.length}</span></h2>
      <div className="sp-endpoint-parameters">
        {visibleItems.map((parameter, index) => <ParameterCard location={location} parameter={parameter} index={index} key={`${location}-${parameter.name}-${index}`} />)}
        {collapsible && (
          <button type="button" className="sp-parameter-toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
            {expanded ? 'Show fewer' : `Show ${hiddenCount} more`}
          </button>
        )}
      </div>
    </section>
  );
}

function GroupedParameterList({ parameters, parameterPrototype }: { parameters: Parameter[]; parameterPrototype?: boolean }) {
  const groups = Object.entries(parameters.reduce<Record<string, Parameter[]>>((result, parameter) => {
    const location = parameter.in ?? 'query';
    (result[location] ??= []).push(parameter);
    return result;
  }, {}));
  return <>{groups.map(([location, items]) => (
    <ParameterGroup location={location} items={items} parameterPrototype={parameterPrototype} key={location} />
  ))}</>;
}

function responseExamples(response?: ResponseObject): { label: string; value: unknown }[] {
  const media = firstMedia(response?.content)?.[1];
  if (!media) return [];
  const examples: { label: string; value: unknown }[] = [];
  if (media.example !== undefined) examples.push({ label: 'Example', value: media.example });
  for (const [name, example] of Object.entries(media.examples ?? {})) {
    const value = example.value ?? example.externalValue;
    if (value !== undefined) examples.push({ label: example.summary ?? name, value });
  }
  if (media.schema?.example !== undefined) examples.push({ label: 'Generic example', value: media.schema.example });
  if (examples.length === 0 && media.schema) examples.push({ label: 'Generated example', value: schemaExample(media.schema) });
  return examples;
}

function schemaExample(schema: SchemaObject, mode: 'request' | 'response' = 'response'): unknown {
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.allOf?.length) {
    return Object.assign({}, ...schema.allOf.map((member) => schemaExample(member, mode)).filter((value) => value && typeof value === 'object' && !Array.isArray(value)));
  }
  if (schema.oneOf?.[0]) return schemaExample(schema.oneOf[0], mode);
  if (schema.anyOf?.[0]) return schemaExample(schema.anyOf[0], mode);
  if (schema.type === 'array' || schema.items) return schema.items ? [schemaExample(schema.items, mode)] : [];
  if (schema.type === 'object' || schema.properties) {
    return Object.fromEntries(Object.entries(schema.properties ?? {})
      .filter(([, property]) => mode === 'request' ? !property.readOnly : !property.writeOnly)
      .map(([name, property]) => [name, schemaExample(property, mode)]));
  }
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return true;
  if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
  if (schema.format === 'date') return '2024-01-01';
  if (schema.format === 'uuid') return '00000000-0000-4000-8000-000000000000';
  return 'string';
}

function requestBodyValue(contentType: string | undefined, media: MediaType | undefined): string {
  const namedExample = Object.values(media?.examples ?? {}).find((example) => example.value !== undefined)?.value;
  const example = media?.example
    ?? namedExample
    ?? (media?.schema ? schemaExample(media.schema, 'request') : undefined)
    ?? (contentType === 'application/json' ? {} : undefined);
  if (example === undefined) return '';
  return typeof example === 'string' ? example : JSON.stringify(example, null, 2);
}

function ResponseExamplePanel({ examples, activeIndex, setActiveIndex }: {
  examples: { label: string; value: unknown }[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}) {
  const activeExample = examples[activeIndex];
  if (!activeExample) return null;

  const title = examples.length > 1 ? (
    <><span>Response example</span><select className="sp-example-select" aria-label="Response example" value={activeIndex} onChange={(event) => setActiveIndex(Number(event.target.value))}>{examples.map((example, index) => <option value={index} key={`${example.label}-${index}`}>{example.label}</option>)}</select></>
  ) : 'Response example';

  return <CodeBlock className="sp-rail-code sp-response-example" title={title} value={JSON.stringify(activeExample.value, null, 2)} />;
}

function EndpointResponseBody({ code, response }: { code: string; response: ResponseObject }) {
  const examples = responseExamples(response);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeExample = examples[activeIndex];
  const statusPhrase = HTTP_STATUS_PHRASES[code];
  const showDescription = response.description?.trim().toLocaleLowerCase() !== statusPhrase?.toLocaleLowerCase();

  return <div className="sp-endpoint-response-grid">
    <div className="sp-response-content">
      <div className={`sp-response-summary ${code.startsWith('2') ? 'is-success' : ''}`}>
        <div className="sp-response-label"><span className="sp-response-code">{code}</span>{statusPhrase && <strong>{statusPhrase}</strong>}</div>
        {showDescription && <Markdown>{response.description}</Markdown>}
      </div>
      <div className="sp-endpoint-response-detail" role="tabpanel">
        {response.headers && <div className="sp-detail-list"><strong>Headers</strong>{Object.entries(response.headers).map(([name, header]) => <div key={name}><code>{name}</code><Markdown>{header.description}</Markdown><SchemaView schema={header.schema} /></div>)}</div>}
        <MediaContent content={response.content} collapseObjects showExamples={false} exampleValue={activeExample?.value} />
        {response.links && <div className="sp-detail-list"><strong>Links</strong>{Object.entries(response.links).map(([name, link]) => <div key={name}><code>{name}</code><Markdown>{link.description}</Markdown><span>{link.operationId ?? link.operationRef}</span></div>)}</div>}
      </div>
    </div>
    <ResponseExamplePanel examples={examples} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
  </div>;
}

function EndpointResponses({ responses }: { responses: Record<string, ResponseObject> }) {
  const entries = Object.entries(responses);
  const [activeCode, setActiveCode] = useState(entries.find(([code]) => code.startsWith('2'))?.[0] ?? entries[0]?.[0]);
  const activeEntry = entries.find(([code]) => code === activeCode);
  const activeResponse = activeEntry?.[1];

  if (!activeCode || !activeResponse) return null;

  return (
    <section className="sp-endpoint-section sp-endpoint-responses">
      <div className="sp-response-tabs-row">
        <h2>Responses</h2>
        <div className="sp-response-tabs" role="tablist" aria-label="Response status">
          {entries.map(([code]) => (
            <button
              type="button"
              role="tab"
              aria-selected={code === activeCode}
              className={`sp-response-tab ${code.startsWith('2') ? 'is-success' : ''}`}
              onClick={() => setActiveCode(code)}
              key={code}
            >
              <span aria-hidden="true" />{code}
            </button>
          ))}
        </div>
      </div>
      <EndpointResponseBody code={activeCode} response={activeResponse} key={activeCode} />
    </section>
  );
}

function RequestRail({
  item,
  server,
  security,
  securitySchemes,
  storageScope,
  parameterPrototype = false,
}: {
  item: OperationModel;
  server: string;
  security?: SecurityRequirement[];
  securitySchemes?: Record<string, SecurityScheme>;
  storageScope: string;
  parameterPrototype?: boolean;
}) {
  const parameters = [...(item.pathItem.parameters ?? []), ...(item.operation.parameters ?? [])];
  const parameterDefaults = Object.fromEntries(parameters.map((parameter) => [
    `${parameter.in}-${parameter.name}`,
    String(parameter.example ?? parameter.schema?.default ?? ''),
  ]));
  const [storedValues, setStoredValues] = useLocalState<Record<string, string>>(`${storageScope}:parameters`, {});
  const values = { ...parameterDefaults, ...storedValues };
  const requirements = item.operation.security ?? security;
  const [selectedSecurityOption, setSelectedSecurityOption] = useState(0);
  const activeRequirement = requirements?.[selectedSecurityOption] ?? requirements?.[0];
  const activeSchemes = Object.entries(activeRequirement ?? {}).map(([name, scopes]) => ({ name, scopes, scheme: securitySchemes?.[name] }));
  const schemeLabel = activeRequirement ? securityRequirementLabel(activeRequirement, securitySchemes) : undefined;
  const [credentials, setCredentials] = useLocalState<Record<string, string>>(`${storageScope}:authorization`, {});
  const [credentialVisible, setCredentialVisible] = useState(false);
  const [parametersExpanded, setParametersExpanded] = useState(false);
  const [selectedOptionalParameters, setSelectedOptionalParameters] = useState<string[]>([]);
  const [optionalPickerOpen, setOptionalPickerOpen] = useState(false);
  const [optionalPickerQuery, setOptionalPickerQuery] = useState('');
  const optionalPickerRef = useRef<HTMLDivElement>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const bodyMedia = firstMedia(item.operation.requestBody?.content);
  const [body, setBody] = useState(() => requestBodyValue(bodyMedia?.[0], bodyMedia?.[1]));
  const [result, setResult] = useState<{ status?: number; statusText?: string; body?: string; error?: string }>();
  const [executing, setExecuting] = useState(false);
  let requestPath = item.path;
  const query = new URLSearchParams();
  const headers: string[] = [];
  const maskedQuery = new URLSearchParams();
  const maskedHeaders: string[] = [];
  const requiredParameters = parameters.filter((parameter) => parameter.required);
  const optionalParameters = parameters.filter((parameter) => !parameter.required);
  const visibleOptionalCount = Math.max(0, DEFAULT_VISIBLE_PARAMETERS - requiredParameters.length);
  const hiddenParameterCount = Math.max(0, optionalParameters.length - visibleOptionalCount);
  const visibleParameters = parametersExpanded || hiddenParameterCount === 0
    ? parameters
    : parameters.filter((parameter) => parameter.required || optionalParameters.indexOf(parameter) < visibleOptionalCount);
  const activePrototypeParameters = parameters.filter((parameter) => parameter.required || selectedOptionalParameters.includes(`${parameter.in}-${parameter.name}`));
  const requestParameters = parameterPrototype ? activePrototypeParameters : parameters;
  const requestBuilderParameters = parameterPrototype ? activePrototypeParameters : visibleParameters;
  const availableOptionalParameters = optionalParameters.filter((parameter) => {
    const key = `${parameter.in}-${parameter.name}`;
    return !selectedOptionalParameters.includes(key) && (!optionalPickerQuery.trim() || parameter.name?.toLowerCase().includes(optionalPickerQuery.trim().toLowerCase()));
  });

  useEffect(() => {
    const input = bodyInputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }, [body]);

  useEffect(() => {
    if (!optionalPickerOpen) return;

    function dismissOptionalPicker(event: MouseEvent | globalThis.KeyboardEvent) {
      if (event instanceof globalThis.KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent && optionalPickerRef.current?.contains(event.target as Node)) return;
      setOptionalPickerOpen(false);
    }

    document.addEventListener('click', dismissOptionalPicker);
    document.addEventListener('keydown', dismissOptionalPicker);
    return () => {
      document.removeEventListener('click', dismissOptionalPicker);
      document.removeEventListener('keydown', dismissOptionalPicker);
    };
  }, [optionalPickerOpen]);

  for (const parameter of requestParameters) {
    const value = values[`${parameter.in}-${parameter.name}`] ?? '';
    if (!parameter.name || !value) continue;
    if (parameter.in === 'path') requestPath = requestPath.replace(`{${parameter.name}}`, encodeURIComponent(value));
    if (parameter.in === 'query') {
      query.set(parameter.name, value);
      maskedQuery.set(parameter.name, value);
    }
    if (parameter.in === 'header') {
      headers.push(`${parameter.name}: ${value}`);
      maskedHeaders.push(`${parameter.name}: ${value}`);
    }
  }
  for (const { name: schemeName, scheme } of activeSchemes) {
    const credential = credentials[schemeName] ?? '';
    if (!credential || !scheme) continue;
    const mask = '••••••••';
    if (scheme.type === 'apiKey' && scheme.in === 'header') {
      headers.push(`${scheme.name ?? schemeName}: ${credential}`);
      maskedHeaders.push(`${scheme.name ?? schemeName}: ${mask}`);
    }
    if (scheme.type === 'apiKey' && scheme.in === 'query') {
      query.set(scheme.name ?? schemeName ?? 'api_key', credential);
      maskedQuery.set(scheme.name ?? schemeName ?? 'api_key', mask);
    }
    if (scheme.type === 'apiKey' && scheme.in === 'cookie') {
      headers.push(`Cookie: ${scheme.name ?? schemeName}=${credential}`);
      maskedHeaders.push(`Cookie: ${scheme.name ?? schemeName}=${mask}`);
    }
    if (scheme.type === 'http') {
      const prefix = scheme.scheme === 'basic' ? 'Basic' : 'Bearer';
      headers.push(`Authorization: ${prefix} ${credential}`);
      maskedHeaders.push(`Authorization: ${prefix} ${mask}`);
    }
  }
  const contentType = bodyMedia?.[0];
  if (contentType) {
    headers.push(`Content-Type: ${contentType}`);
    maskedHeaders.push(`Content-Type: ${contentType}`);
  }
  const requestUrl = `${server.replace(/\/$/, '')}${requestPath}${query.size ? `?${query}` : ''}`;
  const maskedRequestUrl = `${server.replace(/\/$/, '')}${requestPath}${maskedQuery.size ? `?${maskedQuery}` : ''}`;
  async function executeRequest() {
    const missing = parameters.filter((parameter) => parameter.required && !values[`${parameter.in}-${parameter.name}`]?.trim());
    if (missing.length > 0) {
      setResult({ error: `Add the required ${missing.map((parameter) => parameter.name).join(', ')} ${missing.length === 1 ? 'parameter' : 'parameters'}.` });
      return;
    }

    setExecuting(true);
    setResult(undefined);
    try {
      const response = await fetch(requestUrl, {
        method: METHOD_LABELS[item.method],
        headers: Object.fromEntries(headers.map((header) => {
          const separator = header.indexOf(':');
          return [header.slice(0, separator), header.slice(separator + 1).trim()];
        })),
        body: item.method === 'get' || item.method === 'head' || !body ? undefined : body,
      });
      const responseBody = await response.text();
      let formattedBody = responseBody;
      if (responseBody) {
        try { formattedBody = JSON.stringify(JSON.parse(responseBody), null, 2); } catch { /* Keep non-JSON responses as returned. */ }
      }
      setResult({ status: response.status, statusText: response.statusText, body: formattedBody || '(empty response)' });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : 'The request failed.';
      setResult({ error: `${detail} Check the server URL, network connection, and CORS policy.` });
    } finally {
      setExecuting(false);
    }
  }

  return (
    <aside className="sp-request-rail" aria-label="Request builder">
      {activeSchemes.length > 0 && (
        <section className="sp-rail-card">
          <h3>Authorization{schemeLabel && <small>{schemeLabel}</small>}</h3>
          <p className="sp-rail-card-description">Use the {activeSchemes.length === 1 ? 'credential' : 'credentials'} described under Request → Authorization{schemeLabel && `: ${schemeLabel}`}.</p>
          {requirements && requirements.length > 1 && <label className="sp-field sp-auth-method"><span>Authorization method</span><select aria-label="Authorization method" value={selectedSecurityOption} onChange={(event) => setSelectedSecurityOption(Number(event.target.value))}>{requirements.map((requirement, index) => <option value={index} key={index}>{securityRequirementLabel(requirement, securitySchemes)}</option>)}</select></label>}
          <div className="sp-auth-fields">{activeSchemes.map(({ name: schemeName, scheme }) => <label className="sp-field" key={schemeName}><span>{scheme?.name ?? schemeName}</span><div className="sp-secret-field"><input type={credentialVisible ? 'text' : 'password'} autoComplete="off" data-1p-ignore value={credentials[schemeName] ?? ''} onChange={(event) => setCredentials({ ...credentials, [schemeName]: event.target.value })} placeholder={scheme?.type === 'http' ? 'Bearer token' : 'API key'} /><button type="button" aria-label={`${credentialVisible ? 'Hide' : 'Show'} ${activeSchemes.length === 1 ? 'authorization' : scheme?.name ?? schemeName}`} aria-pressed={credentialVisible} onClick={() => setCredentialVisible((visible) => !visible)}><EyeIcon crossed={credentialVisible} /></button></div></label>)}</div>
        </section>
      )}
      {parameters.length > 0 && (
        <section className="sp-rail-card">
          <div className="sp-parameter-card-header">
            <h3>Parameters <span className="sp-section-count">{parameters.length}</span></h3>
            {parameterPrototype && optionalParameters.length > 0 && <div className="sp-optional-parameter-picker" ref={optionalPickerRef}>
              <button type="button" className="sp-add-optional-parameter" onClick={() => setOptionalPickerOpen(!optionalPickerOpen)} aria-expanded={optionalPickerOpen}>+ Add optional parameter</button>
              {optionalPickerOpen && <div className="sp-optional-parameter-menu">
                <input autoFocus value={optionalPickerQuery} onChange={(event) => setOptionalPickerQuery(event.target.value)} placeholder="Find a parameter" aria-label="Find an optional parameter" />
                <div>{availableOptionalParameters.map((parameter) => {
                  const key = `${parameter.in}-${parameter.name}`;
                  return <button type="button" onClick={() => { setSelectedOptionalParameters([...selectedOptionalParameters, key]); setOptionalPickerQuery(''); }} key={key}><strong>{parameter.name}</strong><small>{parameter.description}</small></button>;
                })}{availableOptionalParameters.length === 0 && <span>No parameters found</span>}</div>
              </div>}
            </div>}
          </div>
          <div className="sp-rail-fields">{requestBuilderParameters.map((parameter, index) => {
            const key = `${parameter.in}-${parameter.name}`;
            return <div className="sp-prototype-parameter-field" key={`${key}-${index}`}><label className="sp-field"><span>{parameter.name}{parameter.required && <b>*</b>} <small>{parameter.in}</small></span><input value={values[key] ?? ''} onChange={(event) => setStoredValues({ ...storedValues, [key]: event.target.value })} placeholder={parameter.schema?.type ?? 'value'} /></label>{parameterPrototype && !parameter.required && <button type="button" aria-label={`Remove ${parameter.name}`} onClick={() => setSelectedOptionalParameters(selectedOptionalParameters.filter((selected) => selected !== key))}>×</button>}</div>;
          })}</div>
          {!parameterPrototype && hiddenParameterCount > 0 && (
            <button type="button" className="sp-rail-parameter-toggle" onClick={() => setParametersExpanded(!parametersExpanded)} aria-expanded={parametersExpanded}>
              {parametersExpanded ? 'Show fewer' : `Show ${hiddenParameterCount} more`}
            </button>
          )}
        </section>
      )}
      {bodyMedia && item.method !== 'get' && item.method !== 'head' && (
        <section className="sp-rail-card">
          <h3>Body <small>{contentType}</small></h3>
          <label className="sp-field"><span>Request body</span><textarea ref={bodyInputRef} value={body} onChange={(event) => setBody(event.target.value)} placeholder={contentType === 'application/json' ? '{}' : 'Request body'} /></label>
        </section>
      )}
      <RequestSample
        className="sp-rail-code"
        storageKey="speccy:request-language"
        request={{ method: METHOD_LABELS[item.method] ?? item.method.toUpperCase(), url: maskedRequestUrl, headers: maskedHeaders, body: body && item.method !== 'get' && item.method !== 'head' ? body : undefined }}
        copyRequest={{ method: METHOD_LABELS[item.method] ?? item.method.toUpperCase(), url: requestUrl, headers, body: body && item.method !== 'get' && item.method !== 'head' ? body : undefined }}
      />
      <button type="button" className="sp-execute" disabled={executing} onClick={() => void executeRequest()}><SendIcon /> <span>{executing ? 'Sending…' : 'Send request'}</span></button>
      {result && (
        <section className={`sp-live-response ${result.error ? 'is-error' : ''}`} aria-live="polite">
          <div className="sp-live-response-head"><strong>{result.error ? 'Request failed' : 'Response'}</strong>{result.status !== undefined && <span>{result.status} {result.statusText}</span>}</div>
          {result.error ? <p>{result.error}</p> : <pre><code>{result.body}</code></pre>}
        </section>
      )}
    </aside>
  );
}

function EndpointPage({ item, tag, server, document, storageScope, parameterPrototype, diagnostics = [], showInlineHints, onHideInlineHints, onNavigateTag, hrefForRoute }: { item: OperationModel; tag: TagModel; server: string; document: OpenAPIDocument; storageScope: string; parameterPrototype?: boolean; diagnostics?: ReturnType<typeof analyzeOpenApi>; showInlineHints: boolean; onHideInlineHints: () => void; onNavigateTag: (tag: TagModel) => void; hrefForRoute: (route: SpeccyRoute) => string }) {
  const parameters = [...(item.pathItem.parameters ?? []), ...(item.operation.parameters ?? [])];
  const requirements = item.operation.security ?? document.security;
  const isWebhook = item.source === 'webhook';
  return (
    <article id={item.id} className={`sp-endpoint sp-method-${item.method}`}>
      <header className="sp-endpoint-header">
        <a
          className="sp-tag-kicker sp-tag-link"
          href={hrefForRoute({ page: 'tag', tag: tagSlug(tag) })}
          onClick={(event) => { event.preventDefault(); onNavigateTag(tag); }}
        >{item.tag}</a>
        <h1>{operationTitle(item)}</h1>
        <div className="sp-endpoint-address"><OperationBadge item={item} /><Path value={item.path} /></div>
        <Markdown>{item.operation.description}</Markdown>
        {showInlineHints && <InlineDiagnostics diagnostics={diagnostics.filter((diagnostic) => diagnostic.operationId === item.id)} onHide={onHideInlineHints} />}
      </header>
      <div className={`sp-endpoint-layout ${isWebhook ? 'is-webhook' : ''}`}>
        <div className="sp-endpoint-main">
          {!isWebhook && <section className="sp-endpoint-section sp-request-intro">
            <h2>Request</h2>
            <SecurityRequirements requirements={requirements} schemes={document.components?.securitySchemes} />
            {parameters.length === 0 && !item.operation.requestBody && (
              <div className="sp-request-empty">
                <strong>No request parameters</strong>
                <span>This endpoint doesn’t accept query parameters or a request body.</span>
              </div>
            )}
          </section>}
          <GroupedParameterList parameters={parameters} parameterPrototype={parameterPrototype} />
          {item.operation.requestBody && <section className="sp-endpoint-section sp-request-body"><h2>{isWebhook ? 'Payload' : 'Request body'} {item.operation.requestBody.required && <span className="sp-required" title="Required">*</span>}</h2><Markdown>{item.operation.requestBody.description}</Markdown><MediaContent content={item.operation.requestBody.content} collapseObjects={isWebhook} /></section>}
        </div>
        {!isWebhook && <RequestRail item={item} server={server} security={document.security} securitySchemes={document.components?.securitySchemes ?? document.securityDefinitions} storageScope={storageScope} parameterPrototype={parameterPrototype} />}
      </div>
      {item.operation.responses && <EndpointResponses responses={item.operation.responses} />}
      {item.operation.callbacks && <CallbackList callbacks={item.operation.callbacks} server={server} />}
    </article>
  );
}

function OperationCard({ item, server, defaultExpanded }: {
  item: OperationModel;
  server: string;
  defaultExpanded: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  const parameters = [...(item.pathItem.parameters ?? []), ...(item.operation.parameters ?? [])];
  return (
    <article id={item.id} className={`sp-operation sp-method-${item.method}`}>
      <button type="button" className="sp-operation-summary" onClick={() => setOpen(!open)} aria-expanded={open}>
        <OperationBadge item={item} />
        <code className="sp-path">{item.path}</code>
        <span className="sp-operation-name">{operationTitle(item)}</span>
        {item.operation.deprecated && <span className="sp-deprecated">deprecated</span>}
        <span className="sp-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="sp-operation-body">
          <div className="sp-operation-main">
            <Markdown>{item.operation.description}</Markdown>
            <SecurityRequirements requirements={item.operation.security} />
            <ParameterList parameters={parameters} />
            <RequestBodyView operation={item.operation} />
            {item.operation.responses && (
              <section className="sp-section">
                <h4>Responses</h4>
                <div className="sp-responses">
                  {Object.entries(item.operation.responses).map(([code, response]) => <ResponseView key={code} code={code} response={response} />)}
                </div>
              </section>
            )}
            {item.operation.callbacks && <CallbackList callbacks={item.operation.callbacks} server={server} />}
          </div>
          <CodeSample item={item} server={server} />
        </div>
      )}
    </article>
  );
}

function CallbackList({ callbacks, server }: { callbacks: NonNullable<OperationModel['operation']['callbacks']>; server: string }) {
  return <section className="sp-section"><h4>Callbacks</h4>{Object.entries(callbacks).map(([name, callback]) => (
    <div className="sp-callback" key={name}><h5>{name}</h5>{Object.entries(callback).filter(([expression]) => expression !== '$ref').map(([expression, pathItem]) => (
      typeof pathItem !== 'string' && <div key={expression}><code className="sp-callback-expression">{expression}</code>{operationsInDeclarationOrder(pathItem).map(([method, operation]) => {
        const item: OperationModel = { id: slugify(`callback-${name}-${method}-${expression}`), method, path: expression, operation, pathItem, tag: 'Callbacks', source: 'webhook' };
        return <OperationCard key={method} item={item} server={server} defaultExpanded />;
      })}</div>
    ))}</div>
  ))}</section>;
}

function normalizeBasePath(path: string): string {
  if (!path || path === '/') return '';
  return `/${path.replace(/^\/+|\/+$/g, '')}`;
}

function operationHref(basePath: string, operationId: string): string {
  return `${basePath}/${encodeURIComponent(operationId)}` || '/';
}

function tagHref(basePath: string, tag: TagModel): string {
  return `${basePath}/tags/${encodeURIComponent(tagSlug(tag))}`;
}

function tagSlug(tag: TagModel): string {
  return slugify(tag.name) || tag.name;
}

function referenceHref(basePath: string, key: ReferenceKey): string {
  const slug = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return `${basePath}/reference/${encodeURIComponent(slug)}`;
}

function legacyHrefForRoute(basePath: string, route: SpeccyRoute): string {
  if (route.page === 'operation') return operationHref(basePath, route.operationId);
  if (route.page === 'tag') return `${basePath}/tags/${encodeURIComponent(route.tag)}`;
  if (route.page === 'reference') return referenceHref(basePath, route.section as ReferenceKey);
  return basePath || '/';
}

function routeKey(route: SpeccyRoute): string | undefined {
  if (route.page === 'operation') return route.operationId;
  if (route.page === 'tag') return `tags/${route.tag}`;
  if (route.page === 'reference') return `reference/${route.section}`;
  return undefined;
}

function isReferenceKey(value: string): value is ReferenceKey {
  return value === 'webhooks' || REFERENCE_GROUPS.some(([key]) => key === value);
}

function referenceKeyFromSlug(value: string): ReferenceKey | undefined {
  const key = value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return isReferenceKey(key) ? key : undefined;
}

type SearchResult = {
  id: string;
  group: 'Pages' | 'Tags' | 'Endpoints' | 'Reference';
  label: string;
  detail?: string;
  webhook?: boolean;
  terms: string[];
  navigate: () => void;
};

function QuickSearch({ results, onClose }: { results: SearchResult[]; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = useMemo(() => results.filter((result) => !normalizedQuery || result.terms
    .some((term) => term.toLowerCase().includes(normalizedQuery))), [normalizedQuery, results]);
  const grouped = matches.reduce<Array<[SearchResult['group'], SearchResult[]]>>((groups, result) => {
    const current = groups.at(-1);
    if (current?.[0] === result.group) current[1].push(result);
    else groups.push([result.group, [result]]);
    return groups;
  }, []);

  useEffect(() => setActiveIndex(0), [normalizedQuery]);

  useEffect(() => {
    const activeResult = matches[activeIndex];
    if (!activeResult) return;
    document.getElementById(`sp-search-result-${activeResult.id}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, normalizedQuery]);

  function select(result?: SearchResult) {
    if (!result) return;
    result.navigate();
    onClose();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => matches.length ? (index + 1) % matches.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => matches.length ? (index - 1 + matches.length) % matches.length : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      select(matches[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  let resultIndex = 0;
  return (
    <div className="sp-search-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="sp-search-dialog" role="dialog" aria-modal="true" aria-label="Search API reference">
        <div className="sp-search-input">
          <span aria-hidden="true">⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search endpoints, tags, and reference"
            aria-label="Search API reference"
            aria-controls="sp-search-results"
            aria-activedescendant={matches[activeIndex] ? `sp-search-result-${matches[activeIndex].id}` : undefined}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="sp-search-results" id="sp-search-results" role="listbox">
          {grouped.map(([group, items]) => <section className="sp-search-group" aria-label={group} key={group}>
            <h2>{group}</h2>
            {items.map((result) => {
              const index = resultIndex++;
              return <button
                id={`sp-search-result-${result.id}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? 'is-active' : ''}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(result)}
                key={result.id}
              ><span>{result.label}</span>{result.detail && <small>{result.webhook && <WebhookIcon />} {result.detail}</small>}</button>;
            })}
          </section>)}
          {matches.length === 0 && <div className="sp-search-empty" role="status">No results for “{query}”.</div>}
        </div>
        <div className="sp-search-help"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span></div>
      </div>
    </div>
  );
}

function NavigationGroup({
  tag,
  operations,
  searching,
  activeTag,
  activeOperationId,
  onNavigate,
  onNavigateTag,
  hrefForRoute,
  storageKey,
}: {
  tag: TagModel;
  operations: OperationModel[];
  searching: boolean;
  activeTag?: TagModel;
  activeOperationId?: string;
  onNavigate: (operationId?: string) => void;
  onNavigateTag: (tag: TagModel) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
  storageKey: string;
}) {
  const [open, setOpen] = useLocalState(storageKey, false);
  const groupRef = useRef<HTMLDivElement>(null);
  const activeRouteIsWithinGroup = activeTag === tag || operations.some((item) => item.id === activeOperationId);
  const expanded = searching || open;
  const operationListId = `sp-nav-${slugify(tag.name)}`;
  const subgroupedOperations = new Map<string, OperationModel[]>();
  const navigationItems: Array<OperationModel | { subgroup: string; operations: OperationModel[] }> = [];
  for (const item of operations) {
    const subgroup = item.operation['x-tagSubgroup']?.trim();
    if (!subgroup) {
      navigationItems.push(item);
      continue;
    }
    const existingSubgroup = subgroupedOperations.get(subgroup);
    const subgroupOperations = existingSubgroup ?? [];
    if (!existingSubgroup) navigationItems.push({ subgroup, operations: subgroupOperations });
    subgroupOperations.push(item);
    subgroupedOperations.set(subgroup, subgroupOperations);
  }

  const operationLink = (item: OperationModel) => (
    <a
      className={`sp-nav-operation ${activeOperationId === item.id ? 'is-active' : ''}`}
      href={hrefForRoute({ page: 'operation', operationId: item.id })}
      aria-current={activeOperationId === item.id ? 'page' : undefined}
      onClick={(event) => { event.preventDefault(); onNavigate(item.id); }}
      key={item.id}
    ><span className="sp-nav-operation-label">{item.operation.summary ?? item.path}</span><OperationBadge item={item} compact /></a>
  );

  useEffect(() => {
    if (activeRouteIsWithinGroup) setOpen(true);
  }, [activeRouteIsWithinGroup, setOpen]);

  useEffect(() => {
    if (!activeRouteIsWithinGroup || !expanded) return;
    groupRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeRouteIsWithinGroup, activeOperationId, activeTag, expanded]);

  return (
    <div ref={groupRef} className="sp-nav-group">
      <button
        type="button"
        className={`sp-nav-tag ${tag.icon ? 'has-icon ' : ''}${activeRouteIsWithinGroup ? 'is-active' : ''}`}
        onClick={() => setOpen(!expanded)}
        aria-expanded={expanded}
        aria-controls={operationListId}
      >
        <span className="sp-tag-label"><TagIcon tag={tag} />{tag.name}</span>
        <span className="sp-nav-chevron" aria-hidden="true" />
      </button>
      {expanded && (
        <div id={operationListId}>
          <a
            className={`sp-nav-operation sp-nav-overview ${activeTag === tag ? 'is-active' : ''}`}
            href={hrefForRoute({ page: 'tag', tag: tagSlug(tag) })}
            aria-current={activeTag === tag ? 'page' : undefined}
            onClick={(event) => { event.preventDefault(); onNavigateTag(tag); }}
          >Overview</a>
          {navigationItems.map((item) => 'subgroup' in item ? (
            <section className="sp-nav-subgroup" aria-labelledby={`${operationListId}-${slugify(item.subgroup)}`} key={item.subgroup}>
              <h3 id={`${operationListId}-${slugify(item.subgroup)}`}>{item.subgroup}</h3>
              {item.operations.map(operationLink)}
            </section>
          ) : operationLink(item))}
        </div>
      )}
    </div>
  );
}

function NavigationTags({
  tags,
  matches,
  searching,
  activeTag,
  activeOperationId,
  onNavigate,
  onNavigateTag,
  hrefForRoute,
  storageScope,
}: {
  tags: TagModel[];
  matches: (item: OperationModel) => boolean;
  searching: boolean;
  activeTag?: TagModel;
  activeOperationId?: string;
  onNavigate: (operationId?: string) => void;
  onNavigateTag: (tag: TagModel) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
  storageScope: string;
}) {
  return <>{tags.map((tag) => ({ tag, operations: tag.operations.filter(matches) }))
    .filter(({ operations }) => operations.length > 0)
    .map(({ tag, operations }) => (
      <NavigationGroup tag={tag} operations={operations} searching={searching} activeTag={activeTag} activeOperationId={activeOperationId} onNavigate={onNavigate} onNavigateTag={onNavigateTag} hrefForRoute={hrefForRoute} storageKey={`${storageScope}:navigation:${tag.name}`} key={tag.name} />
    ))}</>;
}

function OperationLink({ item, onNavigate, hrefForRoute }: {
  item: OperationModel;
  onNavigate: (operationId: string) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
}) {
  return (
    <a className="sp-operation-link" href={hrefForRoute({ page: 'operation', operationId: item.id })} onClick={(event) => { event.preventDefault(); onNavigate(item.id); }}>
      <span className="sp-operation-link-summary">{operationTitle(item)}</span>
      <span className="sp-operation-link-address">
        <OperationBadge item={item} />
        <Path className="sp-path" value={item.path} />
      </span>
    </a>
  );
}

function TagIcon({ tag }: { tag: TagModel }) {
  if (!tag.icon) return null;
  return <img className="sp-tag-icon" src={tag.icon.url} alt={tag.icon.alt ?? ''} />;
}

function TagOverview({ tag, operations, diagnostics = [], showInlineHints, onHideInlineHints, onNavigate, hrefForRoute }: {
  tag: TagModel;
  operations: OperationModel[];
  diagnostics?: ReturnType<typeof analyzeOpenApi>;
  showInlineHints: boolean;
  onHideInlineHints: () => void;
  onNavigate: (operationId: string) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
}) {
  return (
    <section className="sp-tag-overview">
      <div className="sp-tag-overview-intro">
        <h1 className="sp-tag-title"><TagIcon tag={tag} />{tag.name}</h1>
        <Markdown>{tag.description}</Markdown>
        {showInlineHints && <InlineDiagnostics diagnostics={diagnostics.filter((diagnostic) => diagnostic.tag === tag.name && !diagnostic.operationId)} onHide={onHideInlineHints} />}
        <Markdown className="sp-tag-long-description">{tag.longDescription}</Markdown>
      </div>
      <div className="sp-tag-overview-operations">
        <h2>Operations</h2>
        <div className="sp-operation-list">{operations.map((item) => (
          <OperationLink item={item} onNavigate={onNavigate} hrefForRoute={hrefForRoute} key={item.id} />
        ))}</div>
      </div>
    </section>
  );
}

function ErrorState({ error }: { error: Error }) {
  return <div className="sp-error" role="alert"><strong>Couldn’t render this spec</strong><p>{error.message}</p></div>;
}

export function Speccy({
  spec,
  className = '',
  defaultExpanded = false,
  showSidebar = true,
  showThemeToggle = true,
  theme = 'system',
  accentColor = '#6d5dfc',
  logo,
  basePath: basePathProp = '/',
  route,
  onNavigate,
  hrefForRoute: controlledHrefForRoute,
  onError,
  showDeveloperHints = false,
  previousSpec,
  spectralDiagnostics,
  parameterPrototype,
}: SpeccyProps) {
  const result = useMemo(() => {
    try {
      const document = parseSpec(spec);
      return { document, model: createReferenceModel(document) };
    } catch (cause) {
      return { error: cause instanceof Error ? cause : new Error('Unable to parse the OpenAPI document.') };
    }
  }, [spec]);
  const diagnostics = useMemo(() => {
    if (!showDeveloperHints || !result.document) return [];
    let previousDocument: OpenAPIDocument | undefined;
    try { previousDocument = previousSpec ? parseSpec(previousSpec) : undefined; } catch { previousDocument = undefined; }
    return analyzeOpenApi(result.document, { previousDocument, spectral: spectralDiagnostics });
  }, [showDeveloperHints, result.document, previousSpec, spectralDiagnostics]);
  const [filterQuery, setFilterQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useLocalState<Theme>('speccy:theme', theme);
  const basePath = normalizeBasePath(basePathProp);
  const storageScope = `speccy:${basePath || '/'}:${result.model?.document.info?.title ?? 'api'}`;
  const [showInlineHints, setShowInlineHints] = useLocalState(`${storageScope}:show-inline-hints`, true);
  const previousTheme = useRef(theme);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previousTheme.current === theme) return;
    previousTheme.current = theme;
    setSelectedTheme(theme);
  }, [theme, setSelectedTheme]);

  const routeFromPath = () => {
    if (typeof window === 'undefined') return undefined;
    const prefix = `${basePath}/`;
    if (!window.location.pathname.startsWith(prefix)) return undefined;
    const remainder = window.location.pathname.slice(prefix.length);
    if (!remainder) return undefined;
    const [segment, value, extra] = remainder.split('/').map(decodeURIComponent);
    if (extra) return undefined;
    const referenceKey = value ? referenceKeyFromSlug(value) : undefined;
    if (segment === 'reference' && referenceKey) return `reference/${referenceKey}`;
    if (segment === 'tags' && value) return `tags/${value}`;
    return !value ? segment : undefined;
  };
  const [internalRoute, setInternalRoute] = useState(routeFromPath);
  const activeRoute = route ? routeKey(route) : internalRoute;
  const hrefForRoute = (nextRoute: SpeccyRoute) => controlledHrefForRoute?.(nextRoute) ?? legacyHrefForRoute(basePath, nextRoute);

  useEffect(() => {
    if (result.error) onError?.(result.error);
  }, [result.error, onError]);

  useEffect(() => {
    if (route) return;
    const syncRoute = () => setInternalRoute(routeFromPath());
    window.addEventListener('popstate', syncRoute);
    syncRoute();
    return () => window.removeEventListener('popstate', syncRoute);
  }, [basePath, route]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  if (result.error || !result.model) return <ErrorState error={result.error ?? new Error('Unknown rendering error.')} />;

  const model = result.model;
  const server = model.document.servers?.[0]?.url ?? '';
  const groupedTagNames = new Set(model.tagGroups.flatMap((group) => group.tags.map((tag) => tag.name)));
  const ungroupedTags = model.tags.filter((tag) => !groupedTagNames.has(tag.name));
  const activeReference = activeRoute?.startsWith('reference/') ? activeRoute.slice('reference/'.length) as ReferenceKey : undefined;
  const activeTagSlug = activeRoute?.startsWith('tags/') ? activeRoute.slice('tags/'.length) : undefined;
  const activeTag = activeTagSlug ? model.tags.find((tag) => tagSlug(tag) === activeTagSlug) : undefined;
  const activeOperation = !activeReference && !activeTag ? [...model.operations, ...model.webhooks].find((item) => item.id === activeRoute) : undefined;
  const style = { '--sp-accent': accentColor } as CSSProperties;
  const overviewDiagnostics = diagnostics.filter((diagnostic) => !diagnostic.operationId && !diagnostic.tag);
  const normalizedFilter = filterQuery.trim().toLowerCase();
  const matchesFilter = (item: OperationModel) => !normalizedFilter || [
    item.path,
    item.method,
    item.operation.summary,
    item.operation.operationId,
    item.tag,
    item.source,
  ].some((value) => value?.toLowerCase().includes(normalizedFilter));
  const filteredOperationCount = [...model.operations, ...model.webhooks].filter(matchesFilter).length;

  function routeForDiagnostic(diagnostic: ReturnType<typeof analyzeOpenApi>[number]): SpeccyRoute {
    const [root, name, method] = diagnostic.path;
    if ((root === 'paths' || root === 'webhooks') && typeof name === 'string' && typeof method === 'string') {
      const operation = [...model.operations, ...model.webhooks].find((item) => item.path === name && item.method === method);
      if (operation) return { page: 'operation', operationId: operation.id };
    }
    if (root === 'components' && typeof name === 'string' && isReferenceKey(name)) return { page: 'reference', section: name };
    if (diagnostic.tag) {
      const tag = model.tags.find((item) => item.name === diagnostic.tag);
      if (tag) return { page: 'tag', tag: tagSlug(tag) };
    }
    return { page: 'overview' };
  }

  function navigate(operationId?: string) {
    const nextRoute: SpeccyRoute = operationId ? { page: 'operation', operationId } : { page: 'overview' };
    if (onNavigate) onNavigate(nextRoute);
    else {
      window.history.pushState({}, '', hrefForRoute(nextRoute));
      setInternalRoute(routeKey(nextRoute));
    }
    rootRef.current?.scrollIntoView({ block: 'start' });
  }

  function navigateTag(tag: TagModel) {
    const nextRoute: SpeccyRoute = { page: 'tag', tag: tagSlug(tag) };
    if (onNavigate) onNavigate(nextRoute);
    else {
      window.history.pushState({}, '', hrefForRoute(nextRoute));
      setInternalRoute(routeKey(nextRoute));
    }
    rootRef.current?.scrollIntoView({ block: 'start' });
  }

  function navigateReference(key: ReferenceKey, component?: string) {
    const nextRoute: SpeccyRoute = { page: 'reference', section: key };
    if (onNavigate) onNavigate(nextRoute);
    else {
      const anchor = component ? componentAnchorId(key, component) : undefined;
      window.history.pushState({}, '', `${hrefForRoute(nextRoute)}${anchor ? `#${anchor}` : ''}`);
      setInternalRoute(routeKey(nextRoute));
    }
    if (component) requestAnimationFrame(() => document.getElementById(componentAnchorId(key, component))?.scrollIntoView({ block: 'start' }));
    else rootRef.current?.scrollIntoView({ block: 'start' });
  }

  function navigateDiagnostic(nextRoute: SpeccyRoute) {
    if (nextRoute.page === 'operation') navigate(nextRoute.operationId);
    else if (nextRoute.page === 'tag') {
      const tag = model.tags.find((item) => tagSlug(item) === nextRoute.tag);
      if (tag) navigateTag(tag);
    } else if (nextRoute.page === 'reference' && isReferenceKey(nextRoute.section)) navigateReference(nextRoute.section);
    else navigate();
  }

  const searchResults: SearchResult[] = [
    { id: 'overview', group: 'Pages', label: 'API overview', terms: ['api overview', model.document.info?.title ?? ''], navigate: () => navigate() },
    ...model.tags.map((tag) => ({
      id: `tag-${tagSlug(tag)}`, group: 'Tags' as const, label: tag.name,
      detail: `${tag.operations.length} endpoint${tag.operations.length === 1 ? '' : 's'}`,
      terms: [tag.name, tag.description ?? '', tag.longDescription ?? ''], navigate: () => navigateTag(tag),
    })),
    ...[...model.operations, ...model.webhooks].map((item) => ({
      id: `operation-${item.id}`, group: 'Endpoints' as const,
      label: item.operation.summary ?? item.operation.operationId ?? item.path,
      detail: item.source === 'webhook' ? item.path : `${METHOD_LABELS[item.method]} ${item.path}`,
      webhook: item.source === 'webhook',
      terms: [item.path, item.method, item.operation.summary ?? '', item.operation.operationId ?? '', item.tag],
      navigate: () => navigate(item.id),
    })),
    ...REFERENCE_GROUPS.flatMap(([key, label]) => Object.keys(model.document.components?.[key] ?? {}).map((name) => ({
      id: `reference-${key}-${slugify(name)}`, group: 'Reference' as const, label: name, detail: label,
      terms: [name, label], navigate: () => navigateReference(key, name),
    }))),
  ];

  return (
    <div ref={rootRef} className={`speccy sp-theme-${selectedTheme} ${showSidebar ? 'sp-with-sidebar' : ''} ${className}`} style={style}>
      {showThemeToggle && <ThemeToggle theme={selectedTheme} onChange={setSelectedTheme} />}
      {showSidebar && (
        <nav className="sp-sidebar" aria-label="API reference">
          <a className={logo ? 'sp-brand has-logo' : 'sp-brand'} href={hrefForRoute({ page: 'overview' })} onClick={(event) => { event.preventDefault(); navigate(); }}>{logo}<span>{model.document.info?.title ?? 'API reference'}</span></a>
          <div className="sp-nav-scroll">
            <a
              className={`sp-nav-operation sp-nav-overview ${!activeRoute ? 'is-active' : ''}`}
              href={hrefForRoute({ page: 'overview' })}
              aria-current={!activeRoute ? 'page' : undefined}
              onClick={(event) => { event.preventDefault(); navigate(); }}
            >All endpoints</a>
            {model.tagGroups.length > 0 ? <>{model.tagGroups.map((group) => {
              const visibleTags = group.tags.filter((tag) => tag.operations.some(matchesFilter));
              if (visibleTags.length === 0) return null;
              return <section className="sp-nav-tag-group" aria-labelledby={`sp-nav-tag-group-${slugify(group.name)}`} key={group.name}>
                <h2 className="sp-nav-heading" id={`sp-nav-tag-group-${slugify(group.name)}`}>{group.name}</h2>
                <NavigationTags tags={visibleTags} matches={matchesFilter} searching={Boolean(normalizedFilter)} activeTag={activeTag} activeOperationId={activeOperation?.id} onNavigate={navigate} onNavigateTag={navigateTag} hrefForRoute={hrefForRoute} storageScope={storageScope} />
              </section>;
            })}<NavigationTags tags={ungroupedTags} matches={matchesFilter} searching={Boolean(normalizedFilter)} activeTag={activeTag} activeOperationId={activeOperation?.id} onNavigate={navigate} onNavigateTag={navigateTag} hrefForRoute={hrefForRoute} storageScope={storageScope} /></> : <NavigationTags tags={model.tags} matches={matchesFilter} searching={Boolean(normalizedFilter)} activeTag={activeTag} activeOperationId={activeOperation?.id} onNavigate={navigate} onNavigateTag={navigateTag} hrefForRoute={hrefForRoute} storageScope={storageScope} />}
            {normalizedFilter && filteredOperationCount === 0 && <div className="sp-nav-empty"><strong>No matching endpoints</strong><span>Try a path, method, or operation name.</span></div>}
            {!normalizedFilter && <ReferenceNavigation document={model.document} activeKey={activeReference} storageKey={`${storageScope}:navigation:reference`} hrefFor={(key) => hrefForRoute({ page: 'reference', section: key })} onNavigate={navigateReference} />}
          </div>
          <div className="sp-sidebar-search">
            <svg className="sp-filter-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} placeholder="Filter endpoints" aria-label="Filter endpoints" />
            {filterQuery && <button type="button" className="sp-search-clear" onClick={() => setFilterQuery('')} aria-label="Clear filter">×</button>}
          </div>
        </nav>
      )}
      <main className="sp-content">
        {!activeOperation && !activeReference && !activeTag && <header className="sp-hero" id="sp-overview">
          <div className="sp-hero-intro">
            <div className="sp-eyebrow">API reference <span>{model.document.info?.version ?? model.document.openapi ?? model.document.swagger}</span></div>
            <h1>{model.document.info?.title ?? 'Untitled API'}</h1>
            <Markdown>{model.document.info?.description}</Markdown>
            {showInlineHints && <InlineDiagnostics diagnostics={overviewDiagnostics} onHide={() => setShowInlineHints(false)} />}
            {model.document.servers?.map((item, index) => item.url && <div className="sp-server" key={`${item.url}-${index}`}><span>{item.description ?? 'Base URL'}</span><code>{item.url}</code><CopyButton value={item.url} /></div>)}
            <SecurityRequirements requirements={model.document.security} schemes={model.document.components?.securitySchemes} />
          </div>
          <OpenApiDownload document={result.document ?? model.document} />
        </header>}
        {!activeOperation && !activeReference && !activeTag && model.tags.map((tag) => {
          const visible = tag.operations;
          if (visible.length === 0) return null;
          return (
            <section className="sp-tag" id={`tag-${tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} key={tag.name}>
              <div className="sp-tag-heading"><div><span className="sp-tag-kicker">Resource</span><h2 className="sp-tag-title"><TagIcon tag={tag} />{tag.name}</h2></div><Markdown>{tag.description}</Markdown></div>
              <div className="sp-operation-list">{visible.map((item) => <OperationLink item={item} onNavigate={navigate} hrefForRoute={hrefForRoute} key={item.id} />)}</div>
            </section>
          );
        })}
        {activeTag && <TagOverview tag={activeTag} operations={activeTag.operations} diagnostics={diagnostics} showInlineHints={showInlineHints} onHideInlineHints={() => setShowInlineHints(false)} onNavigate={navigate} hrefForRoute={hrefForRoute} />}
        {activeOperation && <section className="sp-endpoint-page"><button type="button" className="sp-back" onClick={() => navigate()}>← API overview</button><EndpointPage item={activeOperation} tag={model.tags.find((tag) => tag.name === activeOperation.tag)!} server={server} document={model.document} storageScope={storageScope} parameterPrototype={parameterPrototype} diagnostics={diagnostics} showInlineHints={showInlineHints} onHideInlineHints={() => setShowInlineHints(false)} onNavigateTag={navigateTag} hrefForRoute={hrefForRoute} key={activeOperation.id} /></section>}
        {!activeOperation && !activeReference && !activeTag && model.operations.length === 0 && model.webhooks.length === 0 && <div className="sp-empty">This spec doesn’t contain any operations yet.</div>}
        {activeReference && <section className="sp-endpoint-page"><button type="button" className="sp-back" onClick={() => navigate()}>← API overview</button><DocumentReference activeKey={activeReference} document={model.document} /></section>}
      </main>
      {searchOpen && <QuickSearch results={searchResults} onClose={() => setSearchOpen(false)} />}
      {showDeveloperHints && <DeveloperDiagnostics diagnostics={diagnostics} storageScope={storageScope} showInlineHints={showInlineHints} onShowInlineHintsChange={setShowInlineHints} routeForDiagnostic={routeForDiagnostic} hrefForRoute={hrefForRoute} onNavigate={navigateDiagnostic} />}
    </div>
  );
}
