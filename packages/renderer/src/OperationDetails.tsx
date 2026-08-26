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
  effectiveParameters,
  type MediaType,
  type OperationModel,
  type Parameter,
  type RequestBody,
  type ResponseObject,
  type Schema,
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
import codeBlockStyles from './CodeBlock.module.css';
import { ExampleSelect } from './ExampleSelect';
import {
  DisclosureChevron,
  DisclosureContent,
  RequiredMark,
  httpMethodLabel,
} from './DesignSystem';
import { EyeIcon } from './EyeIcon';
import { Markdown } from './Markdown';
import { serializeParameter } from './parameterSerialization';
import { serializeRequestBody } from './requestBodySerialization';
import { RequestSample } from './RequestSample';
import {
  RequestBodyDetails,
  ResponseDetails,
  resourceSchema,
} from './ResourceDetails';
import { SchemaExplorer } from './SchemaExplorer';
import { JsonValue, SchemaView } from './SchemaView';
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

function objectSchema(schema: Schema | undefined): SchemaObject | undefined {
  return typeof schema === 'object' ? schema : undefined;
}

function schemaTypeText(schema: Schema | undefined): string {
  const type = objectSchema(schema)?.type;
  return Array.isArray(type) ? type.join(' | ') : (type ?? 'value');
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
  const headingSuffix = onlyScheme
    ? `: ${securitySchemeLabel(onlyScheme) ?? onlyEntry?.[0]}`
    : undefined;
  const showSchemeNames = !onlyScheme;
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
            {headingSuffix}
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
                        {showSchemeNames && (
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
  const parameterSchema = objectSchema(resourceSchema(parameter));
  const example =
    parameter.example !== undefined
      ? parameter.example
      : parameterSchema?.example;
  const schema = {
    ...parameterSchema,
    description: parameter.description ?? parameterSchema?.description,
    ...(parameter.deprecated ? { deprecated: true } : {}),
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
      {Object.entries(parameter.examples ?? {}).map(([name, item]) => (
        <div key={name}>
          <strong>{item.summary ?? name}</strong>
          <Markdown>{item.description}</Markdown>
          <JsonValue value={item.value ?? item.externalValue} />
        </div>
      ))}
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
    items.map((parameter) => {
      const schema = objectSchema(resourceSchema(parameter));
      return [
        parameter.name ?? 'unnamed',
        {
          ...schema,
          description: parameter.description ?? schema?.description,
        },
      ];
    }),
  );
  const examples = Object.fromEntries(
    items.flatMap((parameter) => {
      const example =
        parameter.example ?? objectSchema(resourceSchema(parameter))?.example;
      return parameter.name && example !== undefined
        ? [[parameter.name, example]]
        : [];
    }),
  );

  return (
    <>
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
      {items.flatMap((parameter) =>
        Object.entries(parameter.examples ?? {}).map(([name, item]) => (
          <div key={`${parameter.name}-${name}`}>
            <strong>{item.summary ?? name}</strong>
            <Markdown>{item.description}</Markdown>
            <JsonValue value={item.value ?? item.externalValue} />
          </div>
        )),
      )}
    </>
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
  const title = PARAMETER_GROUP_LABELS[location] ?? 'Parameters';
  if (parameterPrototype)
    return (
      <PrototypeParameterGroup
        location={location}
        items={items}
        title={title}
      />
    );
  return <CardParameterGroup location={location} items={items} title={title} />;
}

function PrototypeParameterGroup({
  location,
  items,
  title,
}: {
  location: string;
  items: Parameter[];
  title: string;
}) {
  const [optionalExpanded, setOptionalExpanded] = useState(false);
  const requiredItems = items.filter((parameter) => parameter.required);
  const optionalItems = items.filter((parameter) => !parameter.required);
  const collapsibleOptional =
    optionalItems.length >= MIN_COLLAPSIBLE_OPTIONAL_PARAMETERS;
  const explorerItems = collapsibleOptional ? requiredItems : items;

  return (
    <section className="sp-endpoint-section sp-parameter-prototype">
      <h3>{title}</h3>
      {explorerItems.length > 0 && (
        <ParameterExplorer location={location} items={explorerItems} />
      )}
      {collapsibleOptional && (
        <div
          className={`sp-optional-parameter-docs ${styles.optionalParameterDocs}`}
        >
          <button
            type="button"
            className={`sp-optional-parameter-summary ${styles.optionalParameterSummary}`}
            onClick={() => setOptionalExpanded(!optionalExpanded)}
            aria-expanded={optionalExpanded}
          >
            <span>
              <strong>Pagination, filtering, sorting, and related data</strong>
              <small>Optional {location} parameters</small>
            </span>
            <span>
              {optionalItems.length}
              <DisclosureChevron />
            </span>
          </button>
          {optionalExpanded && (
            <DisclosureContent>
              <ParameterExplorer location={location} items={optionalItems} />
            </DisclosureContent>
          )}
        </div>
      )}
    </section>
  );
}

function CardParameterGroup({
  location,
  items,
  title,
}: {
  location: string;
  items: Parameter[];
  title: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = items.length > DEFAULT_VISIBLE_PARAMETERS;
  const visibleItems = expanded
    ? items
    : items.slice(0, DEFAULT_VISIBLE_PARAMETERS);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <section className="sp-endpoint-section">
      <h3>{title}</h3>
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
  const schema = objectSchema(media.schema);
  if (schema?.example !== undefined)
    examples.push({ label: 'Generic example', value: schema.example });
  if (examples.length === 0 && media.schema !== undefined)
    examples.push({
      label: 'Generated example',
      value: schemaExample(media.schema),
    });
  return examples;
}

function schemaExample(
  schema: Schema,
  mode: 'request' | 'response' = 'response',
  requiredOnly = false,
): unknown {
  if (typeof schema === 'boolean') return schema ? {} : undefined;
  const isObject = schema.type === 'object' || Boolean(schema.properties);
  const preferLiteral = !requiredOnly || !isObject;
  if (schema.const !== undefined) return schema.const;
  if (schema.example !== undefined && preferLiteral) return schema.example;
  if (schema.default !== undefined && preferLiteral) return schema.default;
  if (schema.enum?.length && preferLiteral) return schema.enum[0];
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
        .filter(([, property]) => {
          const object = objectSchema(property);
          return mode === 'request' ? !object?.readOnly : !object?.writeOnly;
        })
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

function requiredRequestBodyExample(
  contentType: string | undefined,
  media: MediaType | undefined,
): unknown {
  if (media?.schema) return schemaExample(media.schema, 'request', true);
  return contentType === 'application/json' ? {} : undefined;
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
      value: requiredRequestBodyExample(contentType, media),
    },
    ...examples,
  ];
}

function exampleTitle(
  label: string,
  examples: { label: string; value: unknown }[],
  activeIndex: number,
  onChange: (index: number) => void,
): ReactNode {
  if (examples.length <= 1) return label;
  return (
    <>
      <span>{label}</span>
      <ExampleSelect
        label={label}
        value={activeIndex}
        onChange={onChange}
        options={examples}
      />
    </>
  );
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

  return (
    <CodeBlock
      className="sp-rail-code sp-response-example"
      title={exampleTitle(
        'Response example',
        examples,
        activeIndex,
        setActiveIndex,
      )}
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
  const schema = objectSchema(resourceSchema(parameter));
  return (
    parameter.example ??
    schema?.example ??
    schema?.default ??
    (parameter.schema !== undefined
      ? schemaExample(parameter.schema, 'request')
      : 'string')
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
  const body = () => {
    if (children != null) return children;
    if (collapsibleValue !== undefined)
      return <CollapsibleJson value={collapsibleValue} />;
    if (code) return value;
    return <CodeLines value={value} />;
  };
  const content = (
    <pre
      className={
        code ? undefined : `sp-code-numbered ${codeBlockStyles.numbered}`
      }
    >
      <code>{body()}</code>
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

function requestBodyDisplayExamples(
  body: RequestBody | undefined,
): { label: string; value: unknown }[] {
  if (!body) return [];
  const [contentType, media] = firstMedia(body.content) ?? [];
  const namedExamples = requestBodyExamples(media);
  if (namedExamples.length) return namedExamples;
  return [
    { label: 'Example', value: requestBodyExampleValue(contentType, media) },
  ];
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
  const examples = requestBodyDisplayExamples(body);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeExample = examples[activeIndex];
  const title = exampleTitle(
    'Request example',
    examples,
    activeIndex,
    setActiveIndex,
  );
  const parameterSections = [
    ['Query parameters', queryParameters],
    ['Headers', headerParameters],
  ] as const;

  return (
    <div className="sp-endpoint-request-grid">
      <div className="sp-endpoint-request-details">
        <div className="sp-request-intro">
          <div className="sp-request-context">
            <SecurityRequirements
              requirements={security}
              schemes={securitySchemes}
            />
          </div>
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
            <RequestBodyDetails
              body={body}
              title={<h3>Request body</h3>}
              showExamples={false}
              exampleValue={activeExample?.value}
            />
          </section>
        )}
      </div>
      <aside
        className={`sp-code-block ${codeBlockStyles.block} sp-request-example`}
      >
        <div className={`sp-code-title ${codeBlockStyles.title}`}>
          <span>{title}</span>
        </div>
        <RequestExampleSection label="Path" value={resolvedPath} code>
          {highlightedResolvedPath(path, pathParameters)}
        </RequestExampleSection>
        {parameterSections.map(([label, items]) => {
          if (items.length === 0) return null;
          const example = parameterObject(items);
          return (
            <RequestExampleSection
              label={label}
              value={JSON.stringify(example, null, 2)}
              collapsibleValue={example}
              key={label}
            />
          );
        })}
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

const isSuccessCode = (code: string) => code.startsWith('2');

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
          className={`sp-response-summary ${isSuccessCode(code) ? 'is-success' : ''}`}
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
    entries.find(([code]) => isSuccessCode(code))?.[0] ?? entries[0]?.[0],
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
              className={`sp-response-tab ${isSuccessCode(code) ? 'is-success' : ''}`}
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

const CREDENTIAL_MASK = '••••••••';

/** One request header line; `secret` is the credential part masked in samples. */
type RequestHeader = { name: string; text: string; secret?: string };
type QueryEntry = {
  name: string;
  value: string;
  allowReserved: boolean;
  secret?: boolean;
};

interface RailTarget {
  label: string;
  initialBodyExample: number;
  targetField: ReactNode;
  requestUrl: (path: string, queryValue: string) => string;
  validationError: () => string | undefined;
  sendLabel: string;
  failureLabel: string;
  serverHint: string;
}

function webhookUrl(target: string, queryValue: string): string {
  if (!queryValue) return target.trim();
  return `${target.trim()}${target.includes('?') ? '&' : '?'}${queryValue}`;
}

function webhookTargetError(target: string): string | undefined {
  let protocol: string | undefined;
  try {
    protocol = new URL(target).protocol;
  } catch {
    protocol = undefined;
  }
  return protocol === 'http:' || protocol === 'https:'
    ? undefined
    : 'Enter a valid HTTP or HTTPS target URL.';
}

function encodePathValue(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map((item) => encodeURIComponent(String(item)));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        encodeURIComponent(name),
        encodeURIComponent(String(item)),
      ]),
    );
  return encodeURIComponent(String(value));
}

function queryString(entries: QueryEntry[], mask: boolean): string {
  return entries
    .map(({ name, value, allowReserved, secret }) => {
      const encoded = encodeURIComponent(
        mask && secret ? CREDENTIAL_MASK : value,
      );
      const encodedValue = allowReserved
        ? encoded.replace(
            /%3A|%2F|%3F|%23|%5B|%5D|%40|%21|%24|%26|%27|%28|%29|%2A|%2B|%2C|%3B|%3D/gi,
            (part) => decodeURIComponent(part),
          )
        : encoded;
      return `${encodeURIComponent(name)}=${encodedValue}`;
    })
    .join('&');
}

function headerLines(headers: RequestHeader[], mask: boolean): string[] {
  return headers.map(({ name, text, secret }) => {
    const secretPart =
      secret === undefined ? '' : mask ? CREDENTIAL_MASK : secret;
    return `${name}: ${text}${secretPart}`;
  });
}

function headerRecord(lines: string[]): Record<string, string> {
  return lines.reduce<Record<string, string>>((result, header) => {
    const separator = header.indexOf(':');
    const name = header.slice(0, separator);
    const value = header.slice(separator + 1).trim();
    result[name] = result[name]
      ? `${result[name]}${name === 'Cookie' ? '; ' : ', '}${value}`
      : value;
    return result;
  }, {});
}

function WebhookTargetField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="sp-rail-card">
      <label className="sp-field">
        <span>
          Target URL <RequiredMark />
        </span>
        <input
          type="url"
          aria-label="Webhook target URL"
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://example.com/webhooks"
        />
      </label>
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
  const parameters = effectiveParameters(item.pathItem, item.operation);
  const parameterDefaults = Object.fromEntries(
    parameters.map((parameter) => [
      `${parameter.in}-${parameter.name}`,
      String(objectSchema(resourceSchema(parameter))?.default ?? ''),
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
  const [webhookTarget, setWebhookTarget] = useLocalState(
    `${storageScope}:webhook-target:${item.id}`,
    '',
  );
  const rail: RailTarget =
    item.source === 'webhook'
      ? {
          label: 'Webhook tester',
          initialBodyExample: bodyExamples.length > 1 ? 1 : 0,
          targetField: (
            <WebhookTargetField
              value={webhookTarget}
              onChange={setWebhookTarget}
            />
          ),
          requestUrl: (_path, queryValue) =>
            webhookUrl(webhookTarget, queryValue),
          validationError: () => webhookTargetError(webhookTarget),
          sendLabel: 'Send test webhook',
          failureLabel: 'Webhook failed',
          serverHint: 'target server URL',
        }
      : {
          label: 'Request builder',
          initialBodyExample: 0,
          targetField: null,
          requestUrl: (path, queryValue) =>
            `${server.replace(/\/$/, '')}${path}${queryValue ? `?${queryValue}` : ''}`,
          validationError: () => undefined,
          sendLabel: 'Send request',
          failureLabel: 'Request failed',
          serverHint: 'server URL',
        };
  const [activeBodyExample, setActiveBodyExample] = useState(
    rail.initialBodyExample,
  );
  const [body, setBody] = useState(() =>
    formatRequestBodyValue(bodyExamples[rail.initialBodyExample]?.value),
  );
  const [result, setResult] = useState<{
    status?: number;
    statusText?: string;
    body?: string;
    error?: string;
  }>();
  const [executing, setExecuting] = useState(false);
  const method = httpMethodLabel(item.method);
  const allowsBody = item.method !== 'get' && item.method !== 'head';
  let requestPath = item.path;
  const query: QueryEntry[] = [];
  const headers: RequestHeader[] = [];
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
    if (
      !parameter.name ||
      (!value && !(parameter.in === 'query' && parameter.allowEmptyValue))
    )
      continue;
    let parsedValue: unknown = value;
    const schema = objectSchema(resourceSchema(parameter));
    if (
      schema?.type === 'array' ||
      schema?.type === 'object' ||
      parameter.content
    ) {
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }
    }
    const serialized = serializeParameter(
      parameter,
      parameter.in === 'path' ? encodePathValue(parsedValue) : parsedValue,
    );
    switch (parameter.in) {
      case 'path':
        if (typeof serialized === 'string')
          requestPath = requestPath.replace(`{${parameter.name}}`, serialized);
        break;
      case 'query':
        if (Array.isArray(serialized))
          for (const [name, value] of serialized)
            query.push({
              name,
              value,
              allowReserved: parameter.allowReserved === true,
            });
        break;
      case 'header':
        if (typeof serialized === 'string')
          headers.push({ name: parameter.name, text: serialized });
        break;
      case 'cookie':
        if (typeof serialized === 'string')
          headers.push({ name: 'Cookie', text: serialized });
        break;
    }
  }
  for (const { name: schemeName, scheme } of activeSchemes) {
    const credential = credentials[schemeName] ?? '';
    if (!credential || !scheme) continue;
    const name = scheme.name ?? schemeName;
    if (scheme.type === 'http') {
      const prefix = scheme.scheme === 'basic' ? 'Basic' : 'Bearer';
      headers.push({
        name: 'Authorization',
        text: `${prefix} `,
        secret: credential,
      });
      continue;
    }
    if (scheme.type !== 'apiKey') continue;
    switch (scheme.in) {
      case 'header':
        headers.push({ name, text: '', secret: credential });
        break;
      case 'query':
        query.push({
          name,
          value: credential,
          allowReserved: false,
          secret: true,
        });
        break;
      case 'cookie':
        headers.push({ name: 'Cookie', text: `${name}=`, secret: credential });
        break;
    }
  }
  const contentType = bodyMedia?.[0];
  const wireBody =
    contentType && bodyMedia?.[1]
      ? serializeRequestBody(contentType, bodyMedia[1], body)
      : undefined;
  if (contentType)
    headers.push({
      name: 'Content-Type',
      text: wireBody?.contentType ?? contentType,
    });
  const sendBody = allowsBody && body ? (wireBody?.body ?? body) : undefined;
  const buildRequest = (mask: boolean) => ({
    method,
    url: rail.requestUrl(requestPath, queryString(query, mask)),
    headers: headerLines(headers, mask),
    body: sendBody,
  });
  const request = buildRequest(false);
  const maskedRequest = buildRequest(true);
  async function executeRequest() {
    const targetError = rail.validationError();
    if (targetError) {
      setResult({ error: targetError });
      return;
    }

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
      const response = await fetch(request.url, {
        method: request.method,
        headers: headerRecord(request.headers),
        body: request.body,
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
        error: `${detail}${detail.endsWith('.') ? '' : '.'} Check the ${rail.serverHint}, network connection, and CORS policy.`,
      });
    } finally {
      setExecuting(false);
    }
  }

  return (
    <aside className="sp-request-rail" aria-label={rail.label}>
      {rail.targetField}
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
                      placeholder={schemaTypeText(parameter.schema)}
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
      {bodyMedia && allowsBody && (
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
        request={maskedRequest}
        copyRequest={request}
      />
      <button
        type="button"
        className="sp-execute"
        disabled={executing}
        onClick={() => void executeRequest()}
      >
        <SendIcon /> <span>{executing ? 'Sending…' : rail.sendLabel}</span>
      </button>
      {result && (
        <section
          className={`sp-live-response ${result.error ? 'is-error' : ''}`}
          aria-live="polite"
        >
          <div className="sp-live-response-head">
            <strong>{result.error ? rail.failureLabel : 'Response'}</strong>
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
              <code>
                <CodeLines value={result.body ?? ''} />
              </code>
            </pre>
          )}
        </section>
      )}
    </aside>
  );
}
