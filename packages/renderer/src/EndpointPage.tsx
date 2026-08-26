/**
 * ---
 * purpose: Renders a single endpoint or webhook page, including its callbacks and try-it rail.
 * related:
 *   - ./Speccy.tsx - Mounts this page when the active route is an operation.
 *   - ./OperationDetails.tsx - Owns request execution and operation detail presentation.
 *   - ./operationSummary.tsx - Shared title, badges, and links.
 * ---
 */

import { useEffect, useState } from 'react';
import {
  effectiveParameters,
  expandServerUrl,
  operationsInDeclarationOrder,
  slugify,
  type ApiDiagnostic,
  type CallbackObject,
  type OpenAPIDocument,
  type OperationModel,
  type PathItem,
  type ResponseObject,
  type ServerObject,
  type TagModel,
} from 'speccy-core';
import { CopyButton } from './CodeBlock';
import { ApiPath, DisclosureChevron, MethodBadge } from './DesignSystem';
import { InlineDiagnostics } from './DeveloperDiagnostics';
import { Markdown } from './Markdown';
import {
  CodeSample,
  EndpointResponses,
  EndpointRequestDetails,
  RequestRail,
  SecurityRequirements,
} from './OperationDetails';
import { OperationRelationships } from './OperationRelationships';
import {
  ParameterDetails,
  RequestBodyDetails,
  ResponseDetails,
} from './ResourceDetails';
import {
  ExternalDocsLink,
  hasUrl,
  LifecycleBadge,
  OperationBadge,
  operationTitle,
  tagSlug,
} from './operationSummary';
import type { SpeccyRoute } from './types';

type RequestBody = OperationModel['operation']['requestBody'];

const COMPACT_ENDPOINT_WIDTH = 900;

function useCompactEndpointLayout(element: HTMLElement | null): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!element || typeof ResizeObserver === 'undefined') return;

    const update = (width: number) => {
      if (width > 0) setCompact(width <= COMPACT_ENDPOINT_WIDTH);
    };
    update(element.getBoundingClientRect().width);

    const observer = new ResizeObserver(([entry]) => {
      if (entry) update(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return compact;
}

function effectiveServers(
  item: OperationModel,
  document: OpenAPIDocument,
): ServerObject[] {
  return (
    item.operation.servers ?? item.pathItem.servers ?? document.servers ?? []
  );
}

export function EndpointPage({
  item,
  tag,
  server,
  document,
  storageScope,
  parameterPrototype,
  tryIt,
  diagnostics = [],
  onViewAllDiagnostics,
  onNavigateTag,
  hrefForRoute,
  operations,
  onNavigateOperation,
}: {
  item: OperationModel;
  tag: TagModel;
  server: string;
  document: OpenAPIDocument;
  storageScope: string;
  parameterPrototype?: boolean;
  tryIt: boolean;
  diagnostics?: ApiDiagnostic[];
  onViewAllDiagnostics: () => void;
  onNavigateTag: (tag: TagModel) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
  operations: OperationModel[];
  onNavigateOperation: (operationId: string) => void;
}) {
  const [endpointElement, setEndpointElement] = useState<HTMLElement | null>(
    null,
  );
  const compactLayout = useCompactEndpointLayout(endpointElement);
  const primaryServer = effectiveServers(item, document)[0];
  const effectiveServer = primaryServer?.url
    ? expandServerUrl(primaryServer.url, primaryServer.variables)
    : server;
  const source =
    item.source === 'webhook'
      ? {
          heroClass: 'is-webhook',
          request: <WebhookPayload body={item.operation.requestBody} />,
        }
      : {
          heroClass: '',
          request: (
            <EndpointRequest
              item={item}
              document={document}
              parameterPrototype={parameterPrototype}
            />
          ),
        };
  const rail = tryIt ? (
    <RequestRail
      item={item}
      server={effectiveServer}
      security={document.security}
      securitySchemes={
        document.components?.securitySchemes ?? document.securityDefinitions
      }
      storageScope={storageScope}
      parameterPrototype={parameterPrototype}
    />
  ) : null;

  return (
    <article
      id={item.id}
      className={`sp-endpoint sp-method-${item.method}`}
      ref={setEndpointElement}
    >
      <div className={`sp-endpoint-hero ${source.heroClass}`}>
        <EndpointHeader
          item={item}
          tag={tag}
          diagnostics={diagnostics}
          onViewAllDiagnostics={onViewAllDiagnostics}
          onNavigateTag={onNavigateTag}
          hrefForRoute={hrefForRoute}
          operations={operations}
          onNavigateOperation={onNavigateOperation}
        />
        {!compactLayout && rail}
      </div>
      {source.request}
      {item.operation.responses && (
        <EndpointResponses responses={item.operation.responses} />
      )}
      {item.operation.callbacks && (
        <CallbackList
          callbacks={item.operation.callbacks}
          server={effectiveServer}
        />
      )}
      {compactLayout && rail && (
        <>
          <div className="sp-request-heading sp-try-it-heading">
            <h2>Try it out</h2>
          </div>
          {rail}
        </>
      )}
    </article>
  );
}

function EndpointHeader({
  item,
  tag,
  diagnostics,
  onViewAllDiagnostics,
  onNavigateTag,
  hrefForRoute,
  operations,
  onNavigateOperation,
}: {
  item: OperationModel;
  tag: TagModel;
  diagnostics: ApiDiagnostic[];
  onViewAllDiagnostics: () => void;
  onNavigateTag: (tag: TagModel) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
  operations: OperationModel[];
  onNavigateOperation: (operationId: string) => void;
}) {
  const deprecated = item.operation.deprecated;
  return (
    <header className="sp-endpoint-header">
      <a
        className="sp-tag-kicker sp-tag-link"
        href={hrefForRoute({ page: 'tag', tag: tagSlug(tag) })}
        onClick={(event) => {
          event.preventDefault();
          onNavigateTag(tag);
        }}
      >
        {item.tag}
      </a>
      <div className={`sp-endpoint-title${deprecated ? ' is-deprecated' : ''}`}>
        <h1>{operationTitle(item)}</h1>
        <LifecycleBadge item={item} />
      </div>
      <div className="sp-endpoint-address">
        {deprecated && <span className="sp-deprecated">deprecated</span>}
        <OperationBadge item={item} />
        <ApiPath value={item.path} wrap />
        <CopyButton value={item.path} label="Copy endpoint path" compact />
      </div>
      {item.pathItem.summary && (
        <p className="sp-endpoint-path-summary">{item.pathItem.summary}</p>
      )}
      <Markdown>{item.pathItem.description}</Markdown>
      <Markdown>{item.operation.description}</Markdown>
      <ExternalDocsLink docs={item.operation.externalDocs} />
      <InlineDiagnostics
        diagnostics={diagnostics.filter(
          (diagnostic) => diagnostic.operationId === item.id,
        )}
        onViewAll={onViewAllDiagnostics}
      />
      <OperationRelationships
        item={item}
        operations={operations}
        hrefForOperation={(operationId) =>
          hrefForRoute({ page: 'operation', operationId })
        }
        onNavigate={onNavigateOperation}
      />
    </header>
  );
}

function EndpointRequest({
  item,
  document,
  parameterPrototype,
}: {
  item: OperationModel;
  document: OpenAPIDocument;
  parameterPrototype?: boolean;
}) {
  return (
    <>
      <div className="sp-request-heading">
        <h2>Request</h2>
        <EndpointServers item={item} document={document} />
      </div>
      <div className="sp-endpoint-layout">
        <div className="sp-endpoint-main">
          <EndpointRequestDetails
            path={item.path}
            parameters={effectiveParameters(item.pathItem, item.operation)}
            body={item.operation.requestBody}
            security={item.operation.security ?? document.security}
            securitySchemes={document.components?.securitySchemes}
            parameterPrototype={parameterPrototype}
          />
        </div>
      </div>
    </>
  );
}

function WebhookPayload({ body }: { body: RequestBody }) {
  return (
    <div className="sp-endpoint-layout is-webhook">
      <div className="sp-endpoint-main">
        {body && (
          <section className="sp-endpoint-section sp-request-body">
            <RequestBodyDetails
              body={body}
              title={<h2>Payload</h2>}
              collapseObjects
            />
          </section>
        )}
      </div>
    </div>
  );
}

function EndpointServers({
  item,
  document,
}: {
  item: OperationModel;
  document: OpenAPIDocument;
}) {
  const scopedServers = item.operation.servers ?? item.pathItem.servers;
  const inheritsRootServers = scopedServers === undefined;
  const effective = effectiveServers(item, document).filter(hasUrl);
  const effectiveUrls = new Set(
    effective.map((server) => expandServerUrl(server.url, server.variables)),
  );
  const rootServers = (document.servers ?? []).filter(hasUrl);
  if (inheritsRootServers && rootServers.length <= 1) return null;
  const rootUrls = new Set(
    rootServers.map((server) => expandServerUrl(server.url, server.variables)),
  );
  const displayedServers = [
    ...rootServers.map((server) => ({
      server,
      available:
        inheritsRootServers ||
        effectiveUrls.has(expandServerUrl(server.url, server.variables)),
    })),
    ...effective
      .filter(
        (server) =>
          !rootUrls.has(expandServerUrl(server.url, server.variables)),
      )
      .map((server) => ({ server, available: true })),
  ];
  if (!displayedServers.length) return null;

  return (
    <div className="sp-endpoint-servers" aria-label="Endpoint availability">
      <span className="sp-endpoint-servers-label">Available on</span>
      <div className="sp-endpoint-server-list">
        {displayedServers.map(({ server, available }, index) => {
          const url = expandServerUrl(server.url, server.variables);
          const name = server.description ?? 'Base URL';
          const key = `${server.url}-${index}`;
          return available ? (
            <AvailableServer name={name} url={url} key={key} />
          ) : (
            <UnavailableServer name={name} url={url} key={key} />
          );
        })}
      </div>
    </div>
  );
}

function AvailableServer({ name, url }: { name: string; url: string }) {
  return (
    <span
      className="sp-endpoint-server"
      aria-label={`${name}: available at ${url}`}
      data-tooltip={url}
      tabIndex={0}
    >
      <span>{name}</span>
    </span>
  );
}

function UnavailableServer({ name, url }: { name: string; url: string }) {
  return (
    <span
      className="sp-endpoint-server is-unavailable"
      aria-label={`${name}: unavailable for this endpoint`}
      title="Unavailable for this endpoint"
    >
      <span>{name}</span>
      <code>{url}</code>
    </span>
  );
}

function ParameterList({
  parameters,
}: {
  parameters: NonNullable<OperationModel['operation']['parameters']>;
}) {
  if (parameters.length === 0) return null;
  return (
    <section className="sp-section">
      <h4>Parameters</h4>
      <div className="sp-parameter-list">
        {parameters.map((parameter, index) => (
          <ParameterDetails
            parameter={parameter}
            density="compact"
            key={`${parameter.in}-${parameter.name}-${index}`}
          />
        ))}
      </div>
    </section>
  );
}

function RequestBodyView({ body }: { body: RequestBody }) {
  if (!body) return null;
  return (
    <section className="sp-section">
      <RequestBodyDetails
        body={body}
        density="compact"
        title={<h4>Request body</h4>}
      />
    </section>
  );
}

function ResponseView({
  code,
  response,
}: {
  code: string;
  response: ResponseObject;
}) {
  const isSuccess = code.startsWith('2');
  const [open, setOpen] = useState(isSuccess);
  return (
    <div className="sp-response">
      <button
        type="button"
        className="sp-response-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className={`sp-status ${isSuccess ? 'is-success' : ''}`}>
          {code}
        </span>
        <span>Response</span>
        <DisclosureChevron />
      </button>
      {open && (
        <div className="sp-response-body">
          <ResponseDetails
            response={response}
            density="compact"
            collapseObjects
          />
        </div>
      )}
    </div>
  );
}

function OperationCard({
  item,
  server,
  defaultExpanded,
  context = 'operation',
}: {
  item: OperationModel;
  server: string;
  defaultExpanded: boolean;
  context?: 'operation' | 'callback';
}) {
  const [open, setOpen] = useState(defaultExpanded);
  const parameters = effectiveParameters(item.pathItem, item.operation);
  const scopedServer =
    item.operation.servers?.[0] ?? item.pathItem.servers?.[0];
  const effectiveServer = scopedServer?.url
    ? expandServerUrl(scopedServer.url, scopedServer.variables)
    : server;
  const presentation =
    context === 'callback'
      ? {
          className: ' sp-callback-operation',
          badge: <MethodBadge method={item.method} />,
          path: null,
          codeSample: null,
        }
      : {
          className: '',
          badge: <OperationBadge item={item} />,
          path: <ApiPath value={item.path} />,
          codeSample: <CodeSample item={item} server={effectiveServer} />,
        };
  return (
    <article
      id={item.id}
      className={`sp-operation sp-method-${item.method}${presentation.className}`}
    >
      <button
        type="button"
        className="sp-operation-summary"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {presentation.badge}
        {presentation.path}
        <span className="sp-operation-name">{operationTitle(item)}</span>
        <span className="sp-operation-metadata">
          <LifecycleBadge item={item} />
          {item.operation.deprecated && (
            <span className="sp-deprecated">deprecated</span>
          )}
        </span>
        <DisclosureChevron />
      </button>
      {open && (
        <div className="sp-operation-body">
          <div className="sp-operation-main">
            <Markdown>{item.operation.description}</Markdown>
            <SecurityRequirements requirements={item.operation.security} />
            <ParameterList parameters={parameters} />
            <RequestBodyView body={item.operation.requestBody} />
            {item.operation.responses && (
              <section className="sp-section">
                <h4>Responses</h4>
                <div className="sp-responses">
                  {Object.entries(item.operation.responses).map(
                    ([code, response]) => (
                      <ResponseView
                        key={code}
                        code={code}
                        response={response}
                      />
                    ),
                  )}
                </div>
              </section>
            )}
            {item.operation.callbacks && (
              <CallbackList
                callbacks={item.operation.callbacks}
                server={effectiveServer}
              />
            )}
          </div>
          {presentation.codeSample}
        </div>
      )}
    </article>
  );
}

function callbackPathItems(callback: CallbackObject): [string, PathItem][] {
  return Object.entries(callback).filter(
    (entry): entry is [string, PathItem] =>
      entry[0] !== '$ref' && typeof entry[1] !== 'string',
  );
}

function CallbackList({
  callbacks,
  server,
}: {
  callbacks: Record<string, CallbackObject>;
  server: string;
}) {
  return (
    <section className="sp-section sp-callbacks">
      <h4>Callbacks</h4>
      <p className="sp-callbacks-intro">
        After this operation, the API may send an HTTP request to a URL supplied
        by the caller.
      </p>
      {Object.entries(callbacks).map(([name, callback]) => (
        <div className="sp-callback" key={name}>
          <div className="sp-callback-heading">
            <h5>{name}</h5>
            <span>API-initiated request</span>
          </div>
          {callbackPathItems(callback).map(([expression, pathItem]) => (
            <div key={expression}>
              <div className="sp-callback-destination">
                <span>Destination from the original request</span>
                <code>{expression}</code>
              </div>
              {operationsInDeclarationOrder(pathItem).map(
                ([method, operation]) => {
                  const item: OperationModel = {
                    id: slugify(`callback-${name}-${method}-${expression}`),
                    method,
                    path: expression,
                    operation,
                    pathItem,
                    tag: 'Callbacks',
                    tags: ['Callbacks'],
                    source: 'webhook',
                  };
                  return (
                    <OperationCard
                      key={method}
                      item={item}
                      server={server}
                      defaultExpanded={false}
                      context="callback"
                    />
                  );
                },
              )}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
