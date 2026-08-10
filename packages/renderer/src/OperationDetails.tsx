/**
 * ---
 * purpose: Renders an operation's parameters, authorization, request execution, samples, and responses.
 * related:
 *   - ./Speccy.tsx - Composes these operation details into endpoint and overview pages.
 *   - ./RequestSample.tsx - Generates language-specific snippets for the assembled request.
 * ---
 */

import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  type MediaType,
  type OperationModel,
  type Parameter,
  type RequestBody,
  type ResponseObject,
  type SchemaObject,
  type SecurityRequirement,
  type SecurityScheme,
} from 'speccy-core';
import {
  CodeBlock,
  CodeLines,
  CollapsibleJson,
  CopyButton,
  TruncatedCode,
} from './CodeBlock';
import { ExampleSelect } from './ExampleSelect';
import {
  DisclosureChevron,
  DisclosureContent,
  HTTP_METHOD_LABELS,
  RequiredMark,
  httpMethodLabel,
} from './DesignSystem';
import { EyeIcon } from './EyeIcon';
import { Markdown } from './Markdown';
import { serializeParameter } from './parameterSerialization';
import { serializeRequestBody } from './requestBodySerialization';
import { RequestSample } from './RequestSample';
import { RequestBodyDetails, ResponseDetails } from './ResourceDetails';
import { SchemaExplorer } from './SchemaExplorer';
import { SchemaView } from './SchemaView';
import { SendIcon } from './SendIcon';
import { useLocalState } from './useLocalState';
import styles from './OperationDetails.module.css';

const HTTP_STATUS_PHRASES: Record<string, string> = {
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',
  104: 'Upload Resumption Supported',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  226: 'IM Used',
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Content Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  421: 'Misdirected Request',
  422: 'Unprocessable Content',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  511: 'Network Authentication Required',
};

function firstMedia(
  content?: Record<string, MediaType>,
): [string, MediaType] | undefined {
  return content ? Object.entries(content)[0] : undefined;
}

function securitySchemeLabel(scheme?: SecurityScheme): string | undefined {
  if (!scheme?.type) return undefined;
  if (scheme.type === 'apiKey') return 'API key';
  if (scheme.type === 'oauth2') return 'OAuth 2';
  if (scheme.type === 'openIdConnect') return 'OpenID Connect';
  if (scheme.type === 'http' && scheme.scheme)
    return scheme.scheme === 'basic'
      ? 'Basic'
      : scheme.scheme.charAt(0).toUpperCase() + scheme.scheme.slice(1);
  return scheme.type;
}

function securityRequirementLabel(
  requirement: SecurityRequirement,
  schemes?: Record<string, SecurityScheme>,
): string {
  return Object.keys(requirement)
    .map((name) => securitySchemeLabel(schemes?.[name]) ?? name)
    .join(' + ');
}

export function SecurityRequirements({
  requirements,
  schemes,
}: {
  requirements?: SecurityRequirement[];
  schemes?: Record<string, SecurityScheme>;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!requirements) return null;
  if (requirements.length === 0)
    return (
      <section className="sp-section">
        <h4>Authorization</h4>
        <p>Public endpoint</p>
      </section>
    );
  const entries = requirements.flatMap((requirement) =>
    Object.entries(requirement),
  );
  const onlyEntry = entries.length === 1 ? entries[0] : undefined;
  const onlyScheme = onlyEntry ? schemes?.[onlyEntry[0]] : undefined;
  return (
    <section className="sp-section sp-security-section">
      <h4 className="sp-security-heading">
        <button
          type="button"
          className="sp-security-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <svg
            className="sp-security-lock"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>
            Authorization
            {onlyScheme &&
              `: ${securitySchemeLabel(onlyScheme) ?? onlyEntry?.[0]}`}
          </span>
          <span
            className="sp-security-info"
            data-tooltip={
              expanded
                ? 'Hide authorization details'
                : 'Show authorization details'
            }
            aria-hidden="true"
          >
            ?
          </span>
        </button>
      </h4>
      {expanded && (
        <DisclosureContent className="sp-security-requirements">
          {requirements.map((requirement, index) => (
            <div className="sp-security-option" key={index}>
              {index > 0 && <span className="sp-security-operator">or</span>}
              <div>
                {Object.entries(requirement).map(
                  ([name, scopes], schemeIndex) => {
                    const scheme = schemes?.[name];
                    return (
                      <div className="sp-security-scheme" key={name}>
                        {schemeIndex > 0 && (
                          <span className="sp-security-operator">and</span>
                        )}
                        {!onlyScheme && (
                          <span>
                            <code>{securitySchemeLabel(scheme) ?? name}</code>
                            {scopes.length > 0 && ` - ${scopes.join(', ')}`}
                          </span>
                        )}
                        <Markdown>{scheme?.description}</Markdown>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          ))}
        </DisclosureContent>
      )}
    </section>
  );
}

export function CodeSample({
  item,
  server,
}: {
  item: OperationModel;
  server: string;
}) {
  const url = `${server.replace(/\/$/, '')}${item.path}`;
  const contentType = firstMedia(item.operation.requestBody?.content)?.[0];
  const request = {
    method: httpMethodLabel(item.method),
    url,
    headers: contentType ? [`Content-Type: ${contentType}`] : [],
  };
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

function ParameterCard({
  location,
  parameter,
  index,
}: {
  location: string;
  parameter: Parameter;
  index: number;
}) {
  const example =
    parameter.example !== undefined
      ? parameter.example
      : parameter.schema?.example;
  const schema = {
    ...parameter.schema,
    description: parameter.description ?? parameter.schema?.description,
  };

  return (
    <div
      className="sp-endpoint-parameter"
      key={`${location}-${parameter.name}-${index}`}
    >
      <SchemaView
        name={parameter.name ?? 'unnamed'}
        schema={schema}
        required={parameter.required}
        summaryOnly
        exampleValue={example}
      />
    </div>
  );
}

function ParameterExplorer({
  location,
  items,
}: {
  location: string;
  items: Parameter[];
}) {
  const title = PARAMETER_GROUP_LABELS[location] ?? 'Parameters';
  const properties = Object.fromEntries(
    items.map((parameter) => [
      parameter.name ?? 'unnamed',
      {
        ...parameter.schema,
        description: parameter.description ?? parameter.schema?.description,
      },
    ]),
  );
  const examples = Object.fromEntries(
    items.flatMap((parameter) => {
      const example = parameter.example ?? parameter.schema?.example;
      return parameter.name && example !== undefined
        ? [[parameter.name, example]]
        : [];
    }),
  );

  return (
    <SchemaExplorer
      schema={{
        title,
        type: 'object',
        properties,
        required: items
          .filter((parameter) => parameter.required)
          .map((parameter) => parameter.name)
          .filter((name): name is string => Boolean(name)),
      }}
      showExample
      showHeader={false}
      exampleValue={examples}
    />
  );
}

function ParameterGroup({
  location,
  items,
  parameterPrototype = false,
}: {
  location: string;
  items: Parameter[];
  parameterPrototype?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const requiredItems = items.filter((parameter) => parameter.required);
  const optionalItems = items.filter((parameter) => !parameter.required);
  const collapsible = items.length > DEFAULT_VISIBLE_PARAMETERS;
  const visibleItems = expanded
    ? items
    : items.slice(0, DEFAULT_VISIBLE_PARAMETERS);
  const hiddenCount = items.length - visibleItems.length;

  if (parameterPrototype) {
    const visibleTogether =
      optionalItems.length < MIN_COLLAPSIBLE_OPTIONAL_PARAMETERS;
    return (
      <section className="sp-endpoint-section sp-parameter-prototype">
        <h3>{PARAMETER_GROUP_LABELS[location] ?? 'Parameters'}</h3>
        {visibleTogether && (
          <ParameterExplorer location={location} items={items} />
        )}
        {!visibleTogether && requiredItems.length > 0 && (
          <ParameterExplorer location={location} items={requiredItems} />
        )}
        {optionalItems.length >= MIN_COLLAPSIBLE_OPTIONAL_PARAMETERS && (
          <div
            className={`sp-optional-parameter-docs ${styles.optionalParameterDocs}`}
          >
            <button
              type="button"
              className={`sp-optional-parameter-summary ${styles.optionalParameterSummary}`}
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              <span>
                <strong>
                  Pagination, filtering, sorting, and related data
                </strong>
                <small>Optional {location} parameters</small>
              </span>
              <span>
                {optionalItems.length}
                <DisclosureChevron />
              </span>
            </button>
            {expanded && (
              <DisclosureContent>
                <ParameterExplorer location={location} items={optionalItems} />
              </DisclosureContent>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="sp-endpoint-section">
      <h3>{PARAMETER_GROUP_LABELS[location] ?? 'Parameters'}</h3>
      <div className="sp-endpoint-parameters">
        {visibleItems.map((parameter, index) => (
          <ParameterCard
            location={location}
            parameter={parameter}
            index={index}
            key={`${location}-${parameter.name}-${index}`}
          />
        ))}
        {collapsible && (
          <button
            type="button"
            className="sp-parameter-toggle"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? 'Show fewer' : `Show ${hiddenCount} more`}
          </button>
        )}
      </div>
    </section>
  );
}

export function GroupedParameterList({
  parameters,
  parameterPrototype,
}: {
  parameters: Parameter[];
  parameterPrototype?: boolean;
}) {
  const groups = Object.entries(
    parameters.reduce<Record<string, Parameter[]>>((result, parameter) => {
      const location = parameter.in ?? 'query';
      (result[location] ??= []).push(parameter);
      return result;
    }, {}),
  );
  return (
    <>
      {groups.map(([location, items]) => (
        <ParameterGroup
          location={location}
          items={items}
          parameterPrototype={parameterPrototype}
          key={location}
        />
      ))}
    </>
  );
}

function responseExamples(
  response?: ResponseObject,
): { label: string; value: unknown }[] {
  const media = firstMedia(response?.content)?.[1];
  if (!media) return [];
  const examples: { label: string; value: unknown }[] = [];
  if (media.example !== undefined)
    examples.push({ label: 'Example', value: media.example });
  for (const [name, example] of Object.entries(media.examples ?? {})) {
    const value = example.value ?? example.externalValue;
    if (value !== undefined)
      examples.push({ label: example.summary ?? name, value });
  }
  if (media.schema?.example !== undefined)
    examples.push({ label: 'Generic example', value: media.schema.example });
  if (examples.length === 0 && media.schema)
    examples.push({
      label: 'Generated example',
      value: schemaExample(media.schema),
    });
  return examples;
}

function schemaExample(
  schema: SchemaObject,
  mode: 'request' | 'response' = 'response',
  requiredOnly = false,
): unknown {
  const isObject = schema.type === 'object' || Boolean(schema.properties);
  if (schema.example !== undefined && (!requiredOnly || !isObject))
    return schema.example;
  if (schema.default !== undefined && (!requiredOnly || !isObject))
    return schema.default;
  if (schema.enum?.length && (!requiredOnly || !isObject))
    return schema.enum[0];
  if (schema.allOf?.length) {
    return Object.assign(
      {},
      ...schema.allOf
        .map((member) => schemaExample(member, mode, requiredOnly))
        .filter(
          (value) =>
            value && typeof value === 'object' && !Array.isArray(value),
        ),
    );
  }
  if (schema.oneOf?.[0])
    return schemaExample(schema.oneOf[0], mode, requiredOnly);
  if (schema.anyOf?.[0])
    return schemaExample(schema.anyOf[0], mode, requiredOnly);
  if (schema.type === 'array' || schema.items)
    return schema.items
      ? [schemaExample(schema.items, mode, requiredOnly)]
      : [];
  if (isObject) {
    const requiredProperties = new Set(schema.required ?? []);
    return Object.fromEntries(
      Object.entries(schema.properties ?? {})
        .filter(([, property]) =>
          mode === 'request' ? !property.readOnly : !property.writeOnly,
        )
        .filter(([name]) => !requiredOnly || requiredProperties.has(name))
        .map(([name, property]) => [
          name,
          schemaExample(property, mode, requiredOnly),
        ]),
    );
  }
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return true;
  if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
  if (schema.format === 'date') return '2024-01-01';
  if (schema.format === 'uuid') return '00000000-0000-4000-8000-000000000000';
  return 'string';
}

function requiredRequestBodyValue(
  contentType: string | undefined,
  media: MediaType | undefined,
): string {
  const value = media?.schema
    ? schemaExample(media.schema, 'request', true)
    : contentType === 'application/json'
      ? {}
      : undefined;
  return formatRequestBodyValue(value);
}

function requestBodyExampleValue(
  contentType: string | undefined,
  media: MediaType | undefined,
): unknown {
  const namedExample = Object.values(media?.examples ?? {}).find(
    (example) => example.value !== undefined,
  )?.value;
  return (
    media?.example ??
    namedExample ??
    (media?.schema ? schemaExample(media.schema, 'request') : undefined) ??
    (contentType === 'application/json' ? {} : undefined)
  );
}

function formatRequestBodyValue(example: unknown): string {
  if (example === undefined) return '';
  return typeof example === 'string'
    ? example
    : JSON.stringify(example, null, 2);
}

function requestBodyExamples(media: MediaType | undefined) {
  return Object.entries(media?.examples ?? {}).flatMap(([name, example]) =>
    example.value === undefined
      ? []
      : [{ label: example.summary ?? name, value: example.value }],
  );
}

function requestBuilderBodyExamples(
  contentType: string | undefined,
  media: MediaType | undefined,
) {
  const examples: { label: string; value: unknown }[] = [];
  if (media?.example !== undefined)
    examples.push({ label: 'Example', value: media.example });
  examples.push(...requestBodyExamples(media));
  if (media?.schema)
    examples.push({
      label: 'Generated example',
      value: schemaExample(media.schema, 'request'),
    });
  return [
    {
      label: 'Required fields',
      value: media?.schema
        ? schemaExample(media.schema, 'request', true)
        : contentType === 'application/json'
          ? {}
          : undefined,
    },
    ...examples,
  ];
}

function ResponseExamplePanel({
  examples,
  activeIndex,
  setActiveIndex,
}: {
  examples: { label: string; value: unknown }[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}) {
  const activeExample = examples[activeIndex];
  if (!activeExample) return null;

  const title =
    examples.length > 1 ? (
      <>
        <span>Response example</span>
        <ExampleSelect
          label="Response example"
          value={activeIndex}
          onChange={setActiveIndex}
          options={examples}
        />
      </>
    ) : (
      'Response example'
    );

  return (
    <CodeBlock
      className="sp-rail-code sp-response-example"
      title={title}
      value={JSON.stringify(activeExample.value, null, 2)}
      copyPlacement="body"
      copyLabel="Copy response"
      lineNumbers
      collapsibleValue={activeExample.value}
      truncateLabel="response"
    />
  );
}

function parameterExample(parameter: Parameter): unknown {
  return (
    parameter.example ??
    parameter.schema?.example ??
    parameter.schema?.default ??
    (parameter.schema ? schemaExample(parameter.schema, 'request') : 'string')
  );
}

function RequestExampleSection({
  label,
  value,
  code = false,
  collapsibleValue,
  truncateLabel,
  children,
}: {
  label: string;
  value: string;
  code?: boolean;
  collapsibleValue?: unknown;
  truncateLabel?: string;
  children?: ReactNode;
}) {
  const content = (
    <pre className={code ? undefined : 'sp-code-numbered'}>
      <code>
        {children ??
          (collapsibleValue !== undefined ? (
            <CollapsibleJson value={collapsibleValue} />
          ) : code ? (
            value
          ) : (
            <CodeLines value={value} />
          ))}
      </code>
    </pre>
  );

  return (
    <section className="sp-request-example-section">
      <header>
        <span>{label}</span>
        <CopyButton
          value={value}
          label={`Copy ${label.toLowerCase()}`}
          compact
        />
      </header>
      {truncateLabel ? (
        <TruncatedCode value={value} label={truncateLabel}>
          {content}
        </TruncatedCode>
      ) : (
        content
      )}
    </section>
  );
}

function highlightedResolvedPath(path: string, parameters: Parameter[]) {
  const examples = new Map(
    parameters.map((parameter) => [
      parameter.name,
      encodeURIComponent(String(parameterExample(parameter))),
    ]),
  );

  return path.split(/(\{[^{}]+\})/g).map((part, index) => {
    const name =
      part.startsWith('{') && part.endsWith('}')
        ? part.slice(1, -1)
        : undefined;
    const example = name ? examples.get(name) : undefined;

    return example === undefined ? (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    ) : (
      <span className="sp-path-parameter" key={`${part}-${index}`}>
        {example}
      </span>
    );
  });
}

export function EndpointRequestDetails({
  path,
  parameters,
  body,
  security,
  securitySchemes,
  parameterPrototype,
}: {
  path: string;
  parameters: Parameter[];
  body?: RequestBody;
  security?: SecurityRequirement[];
  securitySchemes?: Record<string, SecurityScheme>;
  parameterPrototype?: boolean;
}) {
  const pathParameters = parameters.filter(
    (parameter) => parameter.in === 'path',
  );
  const queryParameters = parameters.filter(
    (parameter) => (parameter.in ?? 'query') === 'query',
  );
  const headerParameters = parameters.filter(
    (parameter) => parameter.in === 'header',
  );
  const resolvedPath = pathParameters.reduce(
    (result, parameter) =>
      result.replace(
        `{${parameter.name}}`,
        encodeURIComponent(String(parameterExample(parameter))),
      ),
    path,
  );
  const parameterObject = (items: Parameter[]) =>
    Object.fromEntries(
      items.map((parameter) => [
        parameter.name ?? 'unnamed',
        parameterExample(parameter),
      ]),
    );
  const bodyMedia = firstMedia(body?.content);
  const namedExamples = requestBodyExamples(bodyMedia?.[1]);
  const examples = body
    ? namedExamples.length
      ? namedExamples
      : [
          {
            label: 'Example',
            value: requestBodyExampleValue(bodyMedia?.[0], bodyMedia?.[1]),
          },
        ]
    : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeExample = examples[activeIndex];
  const title =
    examples.length > 1 ? (
      <>
        <span>Request example</span>
        <ExampleSelect
          label="Request example"
          value={activeIndex}
          onChange={setActiveIndex}
          options={examples}
        />
      </>
    ) : (
      'Request example'
    );

  return (
    <div className="sp-endpoint-request-grid">
      <div className="sp-endpoint-request-details">
        <div className="sp-endpoint-section sp-request-intro">
          <SecurityRequirements
            requirements={security}
            schemes={securitySchemes}
          />
          {parameters.length === 0 && !body && (
            <div className="sp-request-empty">
              <strong>No request parameters</strong>
              <span>
                This endpoint doesn’t accept query parameters or a request body.
              </span>
            </div>
          )}
        </div>
        <GroupedParameterList
          parameters={parameters}
          parameterPrototype={parameterPrototype}
        />
        {body && (
          <section className="sp-endpoint-section sp-request-body">
            <h3>Request body {body.required && <RequiredMark />}</h3>
            <RequestBodyDetails
              body={body}
              showExamples={false}
              exampleValue={activeExample?.value}
            />
          </section>
        )}
      </div>
      <aside className="sp-code-block sp-request-example">
        <div className="sp-code-title">
          <span>{title}</span>
        </div>
        <RequestExampleSection label="Path" value={resolvedPath} code>
          {highlightedResolvedPath(path, pathParameters)}
        </RequestExampleSection>
        {queryParameters.length > 0 && (
          <RequestExampleSection
            label="Query parameters"
            value={JSON.stringify(parameterObject(queryParameters), null, 2)}
            collapsibleValue={parameterObject(queryParameters)}
          />
        )}
        {headerParameters.length > 0 && (
          <RequestExampleSection
            label="Headers"
            value={JSON.stringify(parameterObject(headerParameters), null, 2)}
            collapsibleValue={parameterObject(headerParameters)}
          />
        )}
        {activeExample && (
          <RequestExampleSection
            label="Body"
            value={formatRequestBodyValue(activeExample.value)}
            collapsibleValue={activeExample.value}
            truncateLabel="body"
          />
        )}
      </aside>
    </div>
  );
}

function EndpointResponseBody({
  code,
  response,
}: {
  code: string;
  response: ResponseObject;
}) {
  const examples = responseExamples(response);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeExample = examples[activeIndex];
  const statusPhrase = HTTP_STATUS_PHRASES[code];
  const showDescription =
    response.description?.trim().toLocaleLowerCase() !==
    statusPhrase?.toLocaleLowerCase();

  return (
    <div className="sp-endpoint-response-grid">
      <div className="sp-response-content">
        <div
          className={`sp-response-summary ${code.startsWith('2') ? 'is-success' : ''}`}
        >
          <div className="sp-response-label">
            <span className="sp-response-code">{code}</span>
            {statusPhrase && <strong>{statusPhrase}</strong>}
          </div>
          {showDescription && <Markdown>{response.description}</Markdown>}
        </div>
        <div className="sp-endpoint-response-detail" role="tabpanel">
          <ResponseDetails
            response={{ ...response, description: undefined }}
            collapseObjects
            showExamples={false}
            showRootDescription={false}
            exampleValue={activeExample?.value}
          />
        </div>
      </div>
      <ResponseExamplePanel
        examples={examples}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
      />
    </div>
  );
}

export function EndpointResponses({
  responses,
}: {
  responses: Record<string, ResponseObject>;
}) {
  const entries = Object.entries(responses);
  const [activeCode, setActiveCode] = useState(
    entries.find(([code]) => code.startsWith('2'))?.[0] ?? entries[0]?.[0],
  );
  const activeEntry = entries.find(([code]) => code === activeCode);
  const activeResponse = activeEntry?.[1];

  if (!activeCode || !activeResponse) return null;

  return (
    <section className="sp-endpoint-section sp-endpoint-responses">
      <div className="sp-response-tabs-row">
        <h2>Responses</h2>
        <div
          className="sp-response-tabs"
          role="tablist"
          aria-label="Response status"
        >
          {entries.map(([code]) => (
            <button
              type="button"
              role="tab"
              aria-selected={code === activeCode}
              className={`sp-response-tab ${code.startsWith('2') ? 'is-success' : ''}`}
              onClick={() => setActiveCode(code)}
              key={code}
            >
              <span aria-hidden="true" />
              {code}
            </button>
          ))}
        </div>
      </div>
      <EndpointResponseBody
        code={activeCode}
        response={activeResponse}
        key={activeCode}
      />
    </section>
  );
}

export function RequestRail({
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
  const parameters = [
    ...(item.pathItem.parameters ?? []),
    ...(item.operation.parameters ?? []),
  ];
  const parameterDefaults = Object.fromEntries(
    parameters.map((parameter) => [
      `${parameter.in}-${parameter.name}`,
      String(parameter.schema?.default ?? ''),
    ]),
  );
  const [storedValues, setStoredValues] = useLocalState<Record<string, string>>(
    `${storageScope}:parameters`,
    {},
  );
  const values = { ...parameterDefaults, ...storedValues };
  const requirements = item.operation.security ?? security;
  const [selectedSecurityOption, setSelectedSecurityOption] = useState(0);
  const activeRequirement =
    requirements?.[selectedSecurityOption] ?? requirements?.[0];
  const activeSchemes = Object.entries(activeRequirement ?? {}).map(
    ([name, scopes]) => ({ name, scopes, scheme: securitySchemes?.[name] }),
  );
  const schemeLabel = activeRequirement
    ? securityRequirementLabel(activeRequirement, securitySchemes)
    : undefined;
  const [credentials, setCredentials] = useLocalState<Record<string, string>>(
    `${storageScope}:authorization`,
    {},
  );
  const [authorizationExpanded, setAuthorizationExpanded] = useState(false);
  const [authorizationWarning, setAuthorizationWarning] = useState(false);
  const [credentialVisible, setCredentialVisible] = useState(false);
  const [parametersExpanded, setParametersExpanded] = useState(false);
  const [selectedOptionalParameters, setSelectedOptionalParameters] = useState<
    string[]
  >([]);
  const [optionalPickerOpen, setOptionalPickerOpen] = useState(false);
  const [optionalPickerQuery, setOptionalPickerQuery] = useState('');
  const optionalPickerRef = useRef<HTMLDivElement>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const bodyMedia = firstMedia(item.operation.requestBody?.content);
  const bodyExamples = requestBuilderBodyExamples(
    bodyMedia?.[0],
    bodyMedia?.[1],
  );
  const [activeBodyExample, setActiveBodyExample] = useState(0);
  const [body, setBody] = useState(() =>
    requiredRequestBodyValue(bodyMedia?.[0], bodyMedia?.[1]),
  );
  const [result, setResult] = useState<{
    status?: number;
    statusText?: string;
    body?: string;
    error?: string;
  }>();
  const [executing, setExecuting] = useState(false);
  let requestPath = item.path;
  const query: Array<[string, string, boolean]> = [];
  const headers: string[] = [];
  const maskedQuery: Array<[string, string, boolean]> = [];
  const maskedHeaders: string[] = [];
  const requiredParameters = parameters.filter(
    (parameter) => parameter.required,
  );
  const optionalParameters = parameters.filter(
    (parameter) => !parameter.required,
  );
  const visibleOptionalCount = Math.max(
    0,
    DEFAULT_VISIBLE_PARAMETERS - requiredParameters.length,
  );
  const hiddenParameterCount = Math.max(
    0,
    optionalParameters.length - visibleOptionalCount,
  );
  const visibleParameters =
    parametersExpanded || hiddenParameterCount === 0
      ? parameters
      : parameters.filter(
          (parameter) =>
            parameter.required ||
            optionalParameters.indexOf(parameter) < visibleOptionalCount,
        );
  const activePrototypeParameters = parameters.filter(
    (parameter) =>
      parameter.required ||
      selectedOptionalParameters.includes(`${parameter.in}-${parameter.name}`),
  );
  const requestParameters = parameterPrototype
    ? activePrototypeParameters
    : parameters;
  const requestBuilderParameters = parameterPrototype
    ? activePrototypeParameters
    : visibleParameters;
  const availableOptionalParameters = optionalParameters.filter((parameter) => {
    const key = `${parameter.in}-${parameter.name}`;
    return (
      !selectedOptionalParameters.includes(key) &&
      (!optionalPickerQuery.trim() ||
        parameter.name
          ?.toLowerCase()
          .includes(optionalPickerQuery.trim().toLowerCase()))
    );
  });
  const authorizationComplete = activeSchemes.every(({ name }) =>
    credentials[name]?.trim(),
  );

  useEffect(() => {
    if (authorizationComplete) setAuthorizationWarning(false);
  }, [authorizationComplete]);

  useEffect(() => {
    const input = bodyInputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }, [body]);

  useEffect(() => {
    if (!optionalPickerOpen) return;

    function dismissOptionalPicker(
      event: MouseEvent | globalThis.KeyboardEvent,
    ) {
      if (event instanceof globalThis.KeyboardEvent && event.key !== 'Escape')
        return;
      if (
        event instanceof MouseEvent &&
        optionalPickerRef.current?.contains(event.target as Node)
      )
        return;
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
    let parsedValue: unknown = value;
    if (
      parameter.schema?.type === 'array' ||
      parameter.schema?.type === 'object' ||
      parameter.content
    ) {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }
    }
    const pathValue =
      parameter.in === 'path'
        ? Array.isArray(parsedValue)
          ? parsedValue.map((item) => encodeURIComponent(String(item)))
          : parsedValue && typeof parsedValue === 'object'
            ? Object.fromEntries(
                Object.entries(parsedValue).map(([name, item]) => [
                  encodeURIComponent(name),
                  encodeURIComponent(String(item)),
                ]),
              )
            : encodeURIComponent(String(parsedValue))
        : parsedValue;
    const serialized = serializeParameter(parameter, pathValue);
    if (parameter.in === 'path' && typeof serialized === 'string')
      requestPath = requestPath.replace(`{${parameter.name}}`, serialized);
    if (parameter.in === 'query' && Array.isArray(serialized))
      for (const [name, item] of serialized) {
        query.push([name, item, parameter.allowReserved === true]);
        maskedQuery.push([name, item, parameter.allowReserved === true]);
      }
    if (parameter.in === 'header' && typeof serialized === 'string') {
      headers.push(`${parameter.name}: ${serialized}`);
      maskedHeaders.push(`${parameter.name}: ${serialized}`);
    }
    if (parameter.in === 'cookie' && typeof serialized === 'string') {
      headers.push(`Cookie: ${serialized}`);
      maskedHeaders.push(`Cookie: ${serialized}`);
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
      query.push([scheme.name ?? schemeName ?? 'api_key', credential, false]);
      maskedQuery.push([scheme.name ?? schemeName ?? 'api_key', mask, false]);
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
  const wireBody =
    contentType && bodyMedia?.[1]
      ? serializeRequestBody(contentType, bodyMedia[1], body)
      : undefined;
  if (contentType) {
    headers.push(`Content-Type: ${wireBody?.contentType ?? contentType}`);
    maskedHeaders.push(`Content-Type: ${wireBody?.contentType ?? contentType}`);
  }
  const queryString = (items: Array<[string, string, boolean]>) =>
    items
      .map(([name, value, allowReserved]) => {
        const encoded = encodeURIComponent(value);
        const encodedValue = allowReserved
          ? encoded.replace(
              /%3A|%2F|%3F|%23|%5B|%5D|%40|%21|%24|%26|%27|%28|%29|%2A|%2B|%2C|%3B|%3D/gi,
              (part) => decodeURIComponent(part),
            )
          : encoded;
        return `${encodeURIComponent(name)}=${encodedValue}`;
      })
      .join('&');
  const serializedQuery = queryString(query);
  const serializedMaskedQuery = queryString(maskedQuery);
  const requestUrl = `${server.replace(/\/$/, '')}${requestPath}${serializedQuery ? `?${serializedQuery}` : ''}`;
  const maskedRequestUrl = `${server.replace(/\/$/, '')}${requestPath}${serializedMaskedQuery ? `?${serializedMaskedQuery}` : ''}`;
  const requestHeaders = headers.reduce<Record<string, string>>(
    (result, header) => {
      const separator = header.indexOf(':');
      const name = header.slice(0, separator);
      const value = header.slice(separator + 1).trim();
      result[name] = result[name]
        ? `${result[name]}${name === 'Cookie' ? '; ' : ', '}${value}`
        : value;
      return result;
    },
    {},
  );
  async function executeRequest() {
    if (!authorizationComplete) {
      setAuthorizationExpanded(true);
      setAuthorizationWarning(true);
      return;
    }

    const missing = parameters.filter(
      (parameter) =>
        parameter.required &&
        !values[`${parameter.in}-${parameter.name}`]?.trim(),
    );
    if (missing.length > 0) {
      setResult({
        error: `Add the required ${missing.map((parameter) => parameter.name).join(', ')} ${missing.length === 1 ? 'parameter' : 'parameters'}.`,
      });
      return;
    }

    setExecuting(true);
    setResult(undefined);
    try {
      const response = await fetch(requestUrl, {
        method: HTTP_METHOD_LABELS[item.method],
        headers: requestHeaders,
        body:
          item.method === 'get' || item.method === 'head' || !body
            ? undefined
            : (wireBody?.body ?? body),
      });
      const responseBody = await response.text();
      let formattedBody = responseBody;
      if (responseBody) {
        try {
          formattedBody = JSON.stringify(JSON.parse(responseBody), null, 2);
        } catch {
          /* Keep non-JSON responses as returned. */
        }
      }
      setResult({
        status: response.status,
        statusText: response.statusText,
        body: formattedBody || '(empty response)',
      });
    } catch (cause) {
      const detail =
        cause instanceof Error ? cause.message : 'The request failed.';
      setResult({
        error: `${detail} Check the server URL, network connection, and CORS policy.`,
      });
    } finally {
      setExecuting(false);
    }
  }

  return (
    <aside className="sp-request-rail" aria-label="Request builder">
      {activeSchemes.length > 0 && (
        <section
          className={`sp-rail-card sp-authorization-card${authorizationWarning ? ' is-warning' : ''}`}
        >
          <div className="sp-authorization-header">
            <h3>
              <button
                type="button"
                className="sp-authorization-toggle"
                aria-expanded={authorizationExpanded}
                onClick={() => setAuthorizationExpanded(!authorizationExpanded)}
              >
                <DisclosureChevron />
                Authorization{schemeLabel && <small>{schemeLabel}</small>}
              </button>
            </h3>
            {authorizationComplete && (
              <span
                className="sp-authorization-complete"
                aria-label="Authorization configured"
              >
                ✓
              </span>
            )}
          </div>
          {authorizationExpanded && (
            <div className="sp-authorization-content">
              {authorizationWarning && (
                <p className="sp-authorization-warning" role="alert">
                  Enter all required credentials before sending this request.
                </p>
              )}
              {requirements && requirements.length > 1 && (
                <label className="sp-field sp-auth-method">
                  <span>Authorization method</span>
                  <select
                    aria-label="Authorization method"
                    value={selectedSecurityOption}
                    onChange={(event) => {
                      setSelectedSecurityOption(Number(event.target.value));
                      setAuthorizationWarning(false);
                    }}
                  >
                    {requirements.map((requirement, index) => (
                      <option value={index} key={index}>
                        {securityRequirementLabel(requirement, securitySchemes)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="sp-auth-fields">
                {activeSchemes.map(({ name: schemeName, scheme }) => (
                  <label className="sp-field" key={schemeName}>
                    <span>
                      {scheme?.name ?? schemeName} <RequiredMark />
                    </span>
                    <div className="sp-secret-field">
                      <input
                        type={credentialVisible ? 'text' : 'password'}
                        aria-label={scheme?.name ?? schemeName}
                        required
                        autoComplete="off"
                        data-1p-ignore
                        value={credentials[schemeName] ?? ''}
                        onChange={(event) =>
                          setCredentials({
                            ...credentials,
                            [schemeName]: event.target.value,
                          })
                        }
                        placeholder={
                          scheme?.type === 'http' ? 'Bearer token' : 'API key'
                        }
                      />
                      <button
                        type="button"
                        aria-label={`${credentialVisible ? 'Hide' : 'Show'} ${activeSchemes.length === 1 ? 'authorization' : (scheme?.name ?? schemeName)}`}
                        aria-pressed={credentialVisible}
                        onClick={() =>
                          setCredentialVisible((visible) => !visible)
                        }
                      >
                        <EyeIcon crossed={credentialVisible} />
                      </button>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
      {parameters.length > 0 && (
        <section className="sp-rail-card">
          <div
            className={`sp-parameter-card-header ${styles.parameterCardHeader}`}
          >
            <h3>Parameters</h3>
            {parameterPrototype && optionalParameters.length > 0 && (
              <div
                className={`sp-optional-parameter-picker ${styles.optionalParameterPicker}`}
                ref={optionalPickerRef}
              >
                <button
                  type="button"
                  className={`sp-add-optional-parameter ${styles.addOptionalParameter}`}
                  aria-label="Add optional parameter"
                  onClick={() => setOptionalPickerOpen(!optionalPickerOpen)}
                  aria-expanded={optionalPickerOpen}
                >
                  + Optional
                </button>
                {optionalPickerOpen && (
                  <div
                    className={`sp-optional-parameter-menu ${styles.optionalParameterMenu}`}
                  >
                    <input
                      autoFocus
                      value={optionalPickerQuery}
                      onChange={(event) =>
                        setOptionalPickerQuery(event.target.value)
                      }
                      placeholder="Find a parameter"
                      aria-label="Find an optional parameter"
                    />
                    <div>
                      {availableOptionalParameters.map((parameter) => {
                        const key = `${parameter.in}-${parameter.name}`;
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOptionalParameters([
                                ...selectedOptionalParameters,
                                key,
                              ]);
                              setOptionalPickerQuery('');
                            }}
                            key={key}
                          >
                            <strong>{parameter.name}</strong>
                            <small>{parameter.description}</small>
                          </button>
                        );
                      })}
                      {availableOptionalParameters.length === 0 && (
                        <span>No parameters found</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {requestBuilderParameters.length === 0 && (
            <p className="sp-rail-empty">
              No parameters selected. Add an optional parameter to include it in
              the request.
            </p>
          )}
          <div className="sp-rail-fields">
            {requestBuilderParameters.map((parameter, index) => {
              const key = `${parameter.in}-${parameter.name}`;
              return (
                <div
                  className={`sp-prototype-parameter-field ${styles.prototypeParameterField}`}
                  key={`${key}-${index}`}
                >
                  <label className="sp-field">
                    <span>
                      {parameter.name}
                      {parameter.required && <b>*</b>}{' '}
                      <small>{parameter.in}</small>
                    </span>
                    <input
                      value={values[key] ?? ''}
                      onChange={(event) =>
                        setStoredValues({
                          ...storedValues,
                          [key]: event.target.value,
                        })
                      }
                      placeholder={
                        Array.isArray(parameter.schema?.type)
                          ? parameter.schema.type.join(' | ')
                          : (parameter.schema?.type ?? 'value')
                      }
                    />
                  </label>
                  {parameterPrototype && !parameter.required && (
                    <button
                      type="button"
                      aria-label={`Remove ${parameter.name}`}
                      onClick={() =>
                        setSelectedOptionalParameters(
                          selectedOptionalParameters.filter(
                            (selected) => selected !== key,
                          ),
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {!parameterPrototype && hiddenParameterCount > 0 && (
            <button
              type="button"
              className="sp-rail-parameter-toggle"
              onClick={() => setParametersExpanded(!parametersExpanded)}
              aria-expanded={parametersExpanded}
            >
              {parametersExpanded
                ? 'Show fewer'
                : `Show ${hiddenParameterCount} more`}
            </button>
          )}
        </section>
      )}
      {bodyMedia && item.method !== 'get' && item.method !== 'head' && (
        <section className="sp-rail-card">
          <div className="sp-rail-card-heading">
            <h3>
              Body <small>{contentType}</small>
            </h3>
            {bodyExamples.length > 1 && (
              <ExampleSelect
                label="Request builder body example"
                value={activeBodyExample}
                onChange={(index) => {
                  setActiveBodyExample(index);
                  setBody(formatRequestBodyValue(bodyExamples[index]?.value));
                }}
                options={bodyExamples}
              />
            )}
          </div>
          <label className="sp-field">
            <span>
              Request body{' '}
              {item.operation.requestBody?.required && <RequiredMark />}
            </span>
            <textarea
              ref={bodyInputRef}
              aria-label="Request body"
              required={item.operation.requestBody?.required}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                contentType === 'application/json' ? '{}' : 'Request body'
              }
            />
          </label>
        </section>
      )}
      <RequestSample
        className="sp-rail-code"
        storageKey="speccy:request-language"
        request={{
          method: httpMethodLabel(item.method),
          url: maskedRequestUrl,
          headers: maskedHeaders,
          body:
            body && item.method !== 'get' && item.method !== 'head'
              ? (wireBody?.body ?? body)
              : undefined,
        }}
        copyRequest={{
          method: httpMethodLabel(item.method),
          url: requestUrl,
          headers,
          body:
            body && item.method !== 'get' && item.method !== 'head'
              ? (wireBody?.body ?? body)
              : undefined,
        }}
      />
      <button
        type="button"
        className="sp-execute"
        disabled={executing}
        onClick={() => void executeRequest()}
      >
        <SendIcon /> <span>{executing ? 'Sending…' : 'Send request'}</span>
      </button>
      {result && (
        <section
          className={`sp-live-response ${result.error ? 'is-error' : ''}`}
          aria-live="polite"
        >
          <div className="sp-live-response-head">
            <strong>{result.error ? 'Request failed' : 'Response'}</strong>
            {result.status !== undefined && (
              <span>
                {result.status} {result.statusText}
              </span>
            )}
          </div>
          {result.error ? (
            <p>{result.error}</p>
          ) : (
            <pre>
              <code>{result.body}</code>
            </pre>
          )}
        </section>
      )}
    </aside>
  );
}
