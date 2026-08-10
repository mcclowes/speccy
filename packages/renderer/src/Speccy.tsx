/**
 * ---
 * purpose: Renders a complete, searchable OpenAPI reference from the normalized model.
 * related:
 *   - ../../core/src/model.ts - Parses input and builds tag and operation groups.
 *   - ./OperationDetails.tsx - Owns request execution and operation detail presentation.
 *   - ./QuickSearch.tsx - Owns searchable keyboard navigation.
 *   - ./styles.css - Owns the visual system and responsive layout.
 *   - ./types.ts - Declares the public component API.
 * ---
 */

import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  analyzeOpenApi,
  createReferenceModel,
  operationsInDeclarationOrder,
  parseSpec,
  slugify,
  type OpenAPIDocument,
  type OperationModel,
  type ResponseObject,
  type TagModel,
} from 'speccy-core';
import { CopyButton } from './CodeBlock';
import {
  ApiPath,
  DisclosureChevron,
  httpMethodLabel,
  MethodBadge,
  RequiredMark,
} from './DesignSystem';
import {
  DeveloperDiagnostics,
  InlineDiagnostics,
} from './DeveloperDiagnostics';
import { Markdown } from './Markdown';
import { OpenApiDownload } from './OpenApiDownload';
import {
  CodeSample,
  EndpointResponses,
  EndpointRequestDetails,
  RequestRail,
  SecurityRequirements,
} from './OperationDetails';
import { QuickSearch, type SearchResult } from './QuickSearch';
import {
  componentAnchorId,
  DocumentReference,
  ReferenceNavigation,
  REFERENCE_GROUPS,
  type ReferenceKey,
} from './ReferenceSections';
import {
  ParameterDetails,
  RequestBodyDetails,
  ResponseDetails,
} from './ResourceDetails';
import { parseRoutePath, routePath } from './routing';
import type { SpeccyProps, SpeccyRoute } from './types';
import { ThemeToggle, type Theme } from './ThemeToggle';
import { useLocalState } from './useLocalState';

function operationTitle(item: OperationModel): string {
  return (
    item.operation.summary ??
    item.operation.operationId ??
    (item.source === 'webhook' ? item.path : 'Untitled operation')
  );
}

function OperationBadge({
  item,
  compact = false,
}: {
  item: OperationModel;
  compact?: boolean;
}) {
  return (
    <MethodBadge
      method={item.method}
      compact={compact}
      webhook={item.source === 'webhook'}
    />
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

function RequestBodyView({
  operation,
}: {
  operation: OperationModel['operation'];
}) {
  const body = operation.requestBody;
  if (!body) return null;
  return (
    <section className="sp-section">
      <h4>Request body {body.required && <RequiredMark />}</h4>
      <RequestBodyDetails body={body} density="compact" />
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
  const [open, setOpen] = useState(code.startsWith('2'));
  return (
    <div className="sp-response">
      <button
        type="button"
        className="sp-response-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span
          className={`sp-status ${code.startsWith('2') ? 'is-success' : ''}`}
        >
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

function EndpointPage({
  item,
  tag,
  server,
  document,
  storageScope,
  parameterPrototype,
  diagnostics = [],
  showInlineHints,
  onHideInlineHints,
  onNavigateTag,
  hrefForRoute,
}: {
  item: OperationModel;
  tag: TagModel;
  server: string;
  document: OpenAPIDocument;
  storageScope: string;
  parameterPrototype?: boolean;
  diagnostics?: ReturnType<typeof analyzeOpenApi>;
  showInlineHints: boolean;
  onHideInlineHints: () => void;
  onNavigateTag: (tag: TagModel) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
}) {
  const parameters = [
    ...(item.pathItem.parameters ?? []),
    ...(item.operation.parameters ?? []),
  ];
  const requirements = item.operation.security ?? document.security;
  const isWebhook = item.source === 'webhook';
  return (
    <article id={item.id} className={`sp-endpoint sp-method-${item.method}`}>
      <div className={`sp-endpoint-hero ${isWebhook ? 'is-webhook' : ''}`}>
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
          <h1>{operationTitle(item)}</h1>
          <div className="sp-endpoint-address">
            <OperationBadge item={item} />
            <ApiPath value={item.path} wrap />
            <CopyButton value={item.path} label="Copy endpoint path" compact />
          </div>
          <Markdown>{item.operation.description}</Markdown>
          {showInlineHints && (
            <InlineDiagnostics
              diagnostics={diagnostics.filter(
                (diagnostic) => diagnostic.operationId === item.id,
              )}
              onHide={onHideInlineHints}
            />
          )}
        </header>
        {!isWebhook && (
          <RequestRail
            item={item}
            server={server}
            security={document.security}
            securitySchemes={
              document.components?.securitySchemes ??
              document.securityDefinitions
            }
            storageScope={storageScope}
            parameterPrototype={parameterPrototype}
          />
        )}
      </div>
      {!isWebhook && (
        <div className="sp-request-heading">
          <h2>Request</h2>
        </div>
      )}
      <div className={`sp-endpoint-layout ${isWebhook ? 'is-webhook' : ''}`}>
        <div className="sp-endpoint-main">
          {!isWebhook &&
            parameters.length === 0 &&
            !item.operation.requestBody && (
              <div className="sp-endpoint-section sp-request-intro">
                <SecurityRequirements
                  requirements={requirements}
                  schemes={document.components?.securitySchemes}
                />
                <div className="sp-request-empty">
                  <strong>No request parameters</strong>
                  <span>
                    This endpoint doesn’t accept query parameters or a request
                    body.
                  </span>
                </div>
              </div>
            )}
          {!isWebhook &&
            (parameters.length > 0 || item.operation.requestBody) && (
              <EndpointRequestDetails
                path={item.path}
                parameters={parameters}
                body={item.operation.requestBody}
                security={requirements}
                securitySchemes={document.components?.securitySchemes}
                parameterPrototype={parameterPrototype}
              />
            )}
          {isWebhook && item.operation.requestBody && (
            <section className="sp-endpoint-section sp-request-body">
              <h2>
                Payload{' '}
                {item.operation.requestBody.required && <RequiredMark />}
              </h2>
              <RequestBodyDetails
                body={item.operation.requestBody}
                collapseObjects
              />
            </section>
          )}
        </div>
      </div>
      {item.operation.responses && (
        <EndpointResponses responses={item.operation.responses} />
      )}
      {item.operation.callbacks && (
        <CallbackList callbacks={item.operation.callbacks} server={server} />
      )}
    </article>
  );
}

function OperationCard({
  item,
  server,
  defaultExpanded,
}: {
  item: OperationModel;
  server: string;
  defaultExpanded: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  const parameters = [
    ...(item.pathItem.parameters ?? []),
    ...(item.operation.parameters ?? []),
  ];
  return (
    <article id={item.id} className={`sp-operation sp-method-${item.method}`}>
      <button
        type="button"
        className="sp-operation-summary"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <OperationBadge item={item} />
        <ApiPath value={item.path} />
        <span className="sp-operation-name">{operationTitle(item)}</span>
        {item.operation.deprecated && (
          <span className="sp-deprecated">deprecated</span>
        )}
        <DisclosureChevron />
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
                server={server}
              />
            )}
          </div>
          <CodeSample item={item} server={server} />
        </div>
      )}
    </article>
  );
}

function CallbackList({
  callbacks,
  server,
}: {
  callbacks: NonNullable<OperationModel['operation']['callbacks']>;
  server: string;
}) {
  return (
    <section className="sp-section">
      <h4>Callbacks</h4>
      {Object.entries(callbacks).map(([name, callback]) => (
        <div className="sp-callback" key={name}>
          <h5>{name}</h5>
          {Object.entries(callback)
            .filter(([expression]) => expression !== '$ref')
            .map(
              ([expression, pathItem]) =>
                typeof pathItem !== 'string' && (
                  <div key={expression}>
                    <code className="sp-callback-expression">{expression}</code>
                    {operationsInDeclarationOrder(pathItem).map(
                      ([method, operation]) => {
                        const item: OperationModel = {
                          id: slugify(
                            `callback-${name}-${method}-${expression}`,
                          ),
                          method,
                          path: expression,
                          operation,
                          pathItem,
                          tag: 'Callbacks',
                          source: 'webhook',
                        };
                        return (
                          <OperationCard
                            key={method}
                            item={item}
                            server={server}
                            defaultExpanded
                          />
                        );
                      },
                    )}
                  </div>
                ),
            )}
        </div>
      ))}
    </section>
  );
}

function tagSlug(tag: TagModel): string {
  return slugify(tag.name) || tag.name;
}

function routeKey(route: SpeccyRoute): string | undefined {
  if (route.page === 'operation') return route.operationId;
  if (route.page === 'tag') return `tags/${route.tag}`;
  if (route.page === 'reference') return `reference/${route.section}`;
  return undefined;
}

function isReferenceKey(value: string): value is ReferenceKey {
  return (
    value === 'webhooks' || REFERENCE_GROUPS.some(([key]) => key === value)
  );
}

function NavigationGroup({
  tag,
  operations,
  searching,
  open,
  onOpenChange,
  activeTag,
  activeOperationId,
  onNavigate,
  onNavigateTag,
  hrefForRoute,
}: {
  tag: TagModel;
  operations: OperationModel[];
  searching: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTag?: TagModel;
  activeOperationId?: string;
  onNavigate: (operationId?: string) => void;
  onNavigateTag: (tag: TagModel) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const wasActiveRouteWithinGroup = useRef(false);
  const activeRouteIsWithinGroup =
    activeTag === tag ||
    operations.some((item) => item.id === activeOperationId);
  const expanded = searching || open;
  const operationListId = `sp-nav-${slugify(tag.name)}`;
  const subgroupedOperations = new Map<string, OperationModel[]>();
  const navigationItems: Array<
    OperationModel | { subgroup: string; operations: OperationModel[] }
  > = [];
  for (const item of operations) {
    const subgroup = item.operation['x-tagSubgroup']?.trim();
    if (!subgroup) {
      navigationItems.push(item);
      continue;
    }
    const existingSubgroup = subgroupedOperations.get(subgroup);
    const subgroupOperations = existingSubgroup ?? [];
    if (!existingSubgroup)
      navigationItems.push({ subgroup, operations: subgroupOperations });
    subgroupOperations.push(item);
    subgroupedOperations.set(subgroup, subgroupOperations);
  }

  const operationLink = (item: OperationModel) => (
    <a
      className={`sp-nav-operation ${activeOperationId === item.id ? 'is-active' : ''}`}
      href={hrefForRoute({ page: 'operation', operationId: item.id })}
      aria-current={activeOperationId === item.id ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(item.id);
      }}
      key={item.id}
    >
      <span className="sp-nav-operation-label">
        {item.operation.summary ?? item.path}
      </span>
      <OperationBadge item={item} compact />
    </a>
  );

  useEffect(() => {
    if (activeRouteIsWithinGroup && !wasActiveRouteWithinGroup.current)
      onOpenChange(true);
    wasActiveRouteWithinGroup.current = activeRouteIsWithinGroup;
  }, [activeRouteIsWithinGroup, onOpenChange]);

  useEffect(() => {
    if (!activeRouteIsWithinGroup || !expanded) return;
    groupRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeRouteIsWithinGroup, activeOperationId, activeTag, expanded]);

  return (
    <div ref={groupRef} className="sp-nav-group">
      <button
        type="button"
        className={`sp-nav-tag ${tag.icon ? 'has-icon ' : ''}${activeRouteIsWithinGroup ? 'is-active' : ''}`}
        onClick={() => onOpenChange(!expanded)}
        aria-expanded={expanded}
        aria-controls={operationListId}
      >
        <span className="sp-tag-label">
          <TagIcon tag={tag} />
          {tag.name}
        </span>
        <DisclosureChevron />
      </button>
      {expanded && (
        <div className="sp-nav-operations" id={operationListId}>
          <a
            className={`sp-nav-operation sp-nav-overview ${activeTag === tag ? 'is-active' : ''}`}
            href={hrefForRoute({ page: 'tag', tag: tagSlug(tag) })}
            aria-current={activeTag === tag ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault();
              onNavigateTag(tag);
            }}
          >
            Overview
          </a>
          {navigationItems.map((item) =>
            'subgroup' in item ? (
              <section
                className="sp-nav-subgroup"
                aria-labelledby={`${operationListId}-${slugify(item.subgroup)}`}
                key={item.subgroup}
              >
                <h3 id={`${operationListId}-${slugify(item.subgroup)}`}>
                  {item.subgroup}
                </h3>
                {item.operations.map(operationLink)}
              </section>
            ) : (
              operationLink(item)
            ),
          )}
        </div>
      )}
    </div>
  );
}

function NavigationTags({
  tags,
  matches,
  searching,
  openTag,
  onOpenTagChange,
  activeTag,
  activeOperationId,
  onNavigate,
  onNavigateTag,
  hrefForRoute,
}: {
  tags: TagModel[];
  matches: (item: OperationModel) => boolean;
  searching: boolean;
  openTag: string | null;
  onOpenTagChange: (tag: string | null) => void;
  activeTag?: TagModel;
  activeOperationId?: string;
  onNavigate: (operationId?: string) => void;
  onNavigateTag: (tag: TagModel) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
}) {
  return (
    <>
      {tags
        .map((tag) => ({ tag, operations: tag.operations.filter(matches) }))
        .filter(({ operations }) => operations.length > 0)
        .map(({ tag, operations }) => (
          <NavigationGroup
            tag={tag}
            operations={operations}
            searching={searching}
            open={openTag === tag.name}
            onOpenChange={(open) => onOpenTagChange(open ? tag.name : null)}
            activeTag={activeTag}
            activeOperationId={activeOperationId}
            onNavigate={onNavigate}
            onNavigateTag={onNavigateTag}
            hrefForRoute={hrefForRoute}
            key={tag.name}
          />
        ))}
    </>
  );
}

function OperationLink({
  item,
  onNavigate,
  hrefForRoute,
}: {
  item: OperationModel;
  onNavigate: (operationId: string) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
}) {
  return (
    <a
      className="sp-operation-link"
      href={hrefForRoute({ page: 'operation', operationId: item.id })}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(item.id);
      }}
    >
      <span className="sp-operation-link-summary">{operationTitle(item)}</span>
      <span className="sp-operation-link-address">
        <OperationBadge item={item} />
        <ApiPath value={item.path} />
      </span>
    </a>
  );
}

function TagIcon({ tag }: { tag: TagModel }) {
  if (!tag.icon) return null;
  return (
    <img className="sp-tag-icon" src={tag.icon.url} alt={tag.icon.alt ?? ''} />
  );
}

function TagOverview({
  tag,
  operations,
  diagnostics = [],
  showInlineHints,
  onHideInlineHints,
  onNavigate,
  hrefForRoute,
}: {
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
        <h1 className="sp-tag-title">
          <TagIcon tag={tag} />
          {tag.name}
        </h1>
        <Markdown>{tag.description}</Markdown>
        {showInlineHints && (
          <InlineDiagnostics
            diagnostics={diagnostics.filter(
              (diagnostic) =>
                diagnostic.tag === tag.name && !diagnostic.operationId,
            )}
            onHide={onHideInlineHints}
          />
        )}
        <Markdown className="sp-tag-long-description">
          {tag.longDescription}
        </Markdown>
      </div>
      <div className="sp-tag-overview-operations">
        <h2>Operations</h2>
        <div className="sp-operation-list">
          {operations.map((item) => (
            <OperationLink
              item={item}
              onNavigate={onNavigate}
              hrefForRoute={hrefForRoute}
              key={item.id}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ErrorState({ error }: { error: Error }) {
  return (
    <div className="sp-error" role="alert">
      <strong>Couldn’t render this spec</strong>
      <p>{error.message}</p>
    </div>
  );
}

export function Speccy({
  spec,
  className = '',
  defaultExpanded: _defaultExpanded = false,
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
      return {
        error:
          cause instanceof Error
            ? cause
            : new Error('Unable to parse the OpenAPI document.'),
      };
    }
  }, [spec]);
  const diagnostics = useMemo(() => {
    if (!showDeveloperHints || !result.document) return [];
    let previousDocument: OpenAPIDocument | undefined;
    try {
      previousDocument = previousSpec ? parseSpec(previousSpec) : undefined;
    } catch {
      previousDocument = undefined;
    }
    return analyzeOpenApi(result.document, {
      previousDocument,
      spectral: spectralDiagnostics,
    });
  }, [showDeveloperHints, result.document, previousSpec, spectralDiagnostics]);
  const [filterQuery, setFilterQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [openNavigationTag, setOpenNavigationTag] = useState<string | null>(
    null,
  );
  const [selectedTheme, setSelectedTheme] = useLocalState<Theme>(
    'speccy:theme',
    theme,
  );
  const basePath = basePathProp;
  const storageScope = `speccy:${basePath || '/'}:${result.model?.document.info?.title ?? 'api'}`;
  const [showInlineHints, setShowInlineHints] = useLocalState(
    `${storageScope}:show-inline-hints`,
    true,
  );
  const previousTheme = useRef(theme);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previousTheme.current === theme) return;
    previousTheme.current = theme;
    setSelectedTheme(theme);
  }, [theme, setSelectedTheme]);

  const routeFromPath = () => {
    if (typeof window === 'undefined') return undefined;
    const parsed = parseRoutePath(window.location.pathname, basePath, {
      operationSegment: '',
    });
    if (parsed?.page === 'reference' && !isReferenceKey(parsed.section))
      return undefined;
    return parsed ? routeKey(parsed) : undefined;
  };
  const [internalRoute, setInternalRoute] = useState(routeFromPath);
  const activeRoute = route ? routeKey(route) : internalRoute;
  const hrefForRoute = (nextRoute: SpeccyRoute) =>
    controlledHrefForRoute?.(nextRoute) ??
    routePath(nextRoute, basePath, { operationSegment: '' });

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
        setMobileNavigationOpen(false);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  if (result.error || !result.model)
    return (
      <ErrorState
        error={result.error ?? new Error('Unknown rendering error.')}
      />
    );

  const model = result.model;
  const server = model.document.servers?.[0]?.url ?? '';
  const groupedTagNames = new Set(
    model.tagGroups.flatMap((group) => group.tags.map((tag) => tag.name)),
  );
  const ungroupedTags = model.tags.filter(
    (tag) => !groupedTagNames.has(tag.name),
  );
  const activeReference = activeRoute?.startsWith('reference/')
    ? (activeRoute.slice('reference/'.length) as ReferenceKey)
    : undefined;
  const activeTagSlug = activeRoute?.startsWith('tags/')
    ? activeRoute.slice('tags/'.length)
    : undefined;
  const activeTag = activeTagSlug
    ? model.tags.find((tag) => tagSlug(tag) === activeTagSlug)
    : undefined;
  const activeOperation =
    !activeReference && !activeTag
      ? [...model.operations, ...model.webhooks].find(
          (item) => item.id === activeRoute,
        )
      : undefined;
  const style = { '--sp-accent': accentColor } as CSSProperties;
  const overviewDiagnostics = diagnostics.filter(
    (diagnostic) => !diagnostic.operationId && !diagnostic.tag,
  );
  const normalizedFilter = filterQuery.trim().toLowerCase();
  const matchesFilter = (item: OperationModel) =>
    !normalizedFilter ||
    [
      item.path,
      item.method,
      item.operation.summary,
      item.operation.operationId,
      item.tag,
      item.source,
    ].some((value) => value?.toLowerCase().includes(normalizedFilter));
  const filteredOperationCount = [
    ...model.operations,
    ...model.webhooks,
  ].filter(matchesFilter).length;

  function routeForDiagnostic(
    diagnostic: ReturnType<typeof analyzeOpenApi>[number],
  ): SpeccyRoute {
    const [root, name, method] = diagnostic.path;
    if (
      (root === 'paths' || root === 'webhooks') &&
      typeof name === 'string' &&
      typeof method === 'string'
    ) {
      const operation = [...model.operations, ...model.webhooks].find(
        (item) => item.path === name && item.method === method,
      );
      if (operation) return { page: 'operation', operationId: operation.id };
    }
    if (
      root === 'components' &&
      typeof name === 'string' &&
      isReferenceKey(name)
    )
      return { page: 'reference', section: name };
    if (diagnostic.tag) {
      const tag = model.tags.find((item) => item.name === diagnostic.tag);
      if (tag) return { page: 'tag', tag: tagSlug(tag) };
    }
    return { page: 'overview' };
  }

  function navigate(operationId?: string) {
    const nextRoute: SpeccyRoute = operationId
      ? { page: 'operation', operationId }
      : { page: 'overview' };
    if (onNavigate) onNavigate(nextRoute);
    else {
      window.history.pushState({}, '', hrefForRoute(nextRoute));
      setInternalRoute(routeKey(nextRoute));
    }
    rootRef.current?.scrollIntoView({ block: 'start' });
    setMobileNavigationOpen(false);
  }

  function navigateTag(tag: TagModel) {
    const nextRoute: SpeccyRoute = { page: 'tag', tag: tagSlug(tag) };
    if (onNavigate) onNavigate(nextRoute);
    else {
      window.history.pushState({}, '', hrefForRoute(nextRoute));
      setInternalRoute(routeKey(nextRoute));
    }
    rootRef.current?.scrollIntoView({ block: 'start' });
    setMobileNavigationOpen(false);
  }

  function navigateReference(key: ReferenceKey, component?: string) {
    const nextRoute: SpeccyRoute = { page: 'reference', section: key };
    if (onNavigate) onNavigate(nextRoute);
    else {
      const anchor = component ? componentAnchorId(key, component) : undefined;
      window.history.pushState(
        {},
        '',
        `${hrefForRoute(nextRoute)}${anchor ? `#${anchor}` : ''}`,
      );
      setInternalRoute(routeKey(nextRoute));
    }
    if (component)
      requestAnimationFrame(() =>
        document
          .getElementById(componentAnchorId(key, component))
          ?.scrollIntoView({ block: 'start' }),
      );
    else rootRef.current?.scrollIntoView({ block: 'start' });
    setMobileNavigationOpen(false);
  }

  function navigateDiagnostic(nextRoute: SpeccyRoute) {
    if (nextRoute.page === 'operation') navigate(nextRoute.operationId);
    else if (nextRoute.page === 'tag') {
      const tag = model.tags.find((item) => tagSlug(item) === nextRoute.tag);
      if (tag) navigateTag(tag);
    } else if (
      nextRoute.page === 'reference' &&
      isReferenceKey(nextRoute.section)
    )
      navigateReference(nextRoute.section);
    else navigate();
  }

  const searchResults: SearchResult[] = [
    {
      id: 'overview',
      group: 'Pages',
      label: 'API overview',
      terms: ['api overview', model.document.info?.title ?? ''],
      navigate: () => navigate(),
    },
    ...model.tags.map((tag) => ({
      id: `tag-${tagSlug(tag)}`,
      group: 'Tags' as const,
      label: tag.name,
      detail: `${tag.operations.length} endpoint${tag.operations.length === 1 ? '' : 's'}`,
      terms: [tag.name, tag.description ?? '', tag.longDescription ?? ''],
      navigate: () => navigateTag(tag),
    })),
    ...[...model.operations, ...model.webhooks].map((item) => ({
      id: `operation-${item.id}`,
      group: 'Endpoints' as const,
      label: item.operation.summary ?? item.operation.operationId ?? item.path,
      detail:
        item.source === 'webhook'
          ? item.path
          : `${httpMethodLabel(item.method)} ${item.path}`,
      webhook: item.source === 'webhook',
      terms: [
        item.path,
        item.method,
        item.operation.summary ?? '',
        item.operation.operationId ?? '',
        item.tag,
      ],
      navigate: () => navigate(item.id),
    })),
    ...REFERENCE_GROUPS.flatMap(([key, label]) =>
      Object.keys(model.document.components?.[key] ?? {}).map((name) => ({
        id: `reference-${key}-${slugify(name)}`,
        group: 'Reference' as const,
        label: name,
        detail: label,
        terms: [name, label],
        navigate: () => navigateReference(key, name),
      })),
    ),
  ];

  return (
    <div
      ref={rootRef}
      className={`speccy sp-theme-${selectedTheme} ${showSidebar ? 'sp-with-sidebar' : ''} ${className}`}
      style={style}
    >
      {showThemeToggle && (
        <ThemeToggle theme={selectedTheme} onChange={setSelectedTheme} />
      )}
      {showSidebar && (
        <>
          <header className="sp-mobile-header">
            <span>{model.document.info?.title ?? 'API reference'}</span>
            <button
              type="button"
              className="sp-mobile-nav-toggle"
              aria-expanded={mobileNavigationOpen}
              aria-controls="sp-sidebar-navigation"
              aria-label="Open navigation"
              onClick={() => setMobileNavigationOpen(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </header>
          <button
            type="button"
            className={`sp-mobile-nav-backdrop ${mobileNavigationOpen ? 'is-open' : ''}`}
            aria-label="Close navigation"
            onClick={() => setMobileNavigationOpen(false)}
          />
          <nav
            id="sp-sidebar-navigation"
            className={`sp-sidebar ${mobileNavigationOpen ? 'is-open' : ''}`}
            aria-label="API reference"
          >
            <a
              className={logo ? 'sp-brand has-logo' : 'sp-brand'}
              href={hrefForRoute({ page: 'overview' })}
              onClick={(event) => {
                event.preventDefault();
                navigate();
              }}
            >
              {logo}
              <span>{model.document.info?.title ?? 'API reference'}</span>
            </a>
            <div className="sp-nav-scroll">
              <a
                className={`sp-nav-operation sp-nav-overview ${!activeRoute ? 'is-active' : ''}`}
                href={hrefForRoute({ page: 'overview' })}
                aria-current={!activeRoute ? 'page' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  navigate();
                }}
              >
                All endpoints
              </a>
              {model.tagGroups.length > 0 ? (
                <>
                  {model.tagGroups.map((group) => {
                    const visibleTags = group.tags.filter((tag) =>
                      tag.operations.some(matchesFilter),
                    );
                    if (visibleTags.length === 0) return null;
                    return (
                      <section
                        className="sp-nav-tag-group"
                        aria-labelledby={`sp-nav-tag-group-${slugify(group.name)}`}
                        key={group.name}
                      >
                        <h2
                          className="sp-nav-heading"
                          id={`sp-nav-tag-group-${slugify(group.name)}`}
                        >
                          {group.name}
                        </h2>
                        <NavigationTags
                          tags={visibleTags}
                          matches={matchesFilter}
                          searching={Boolean(normalizedFilter)}
                          openTag={openNavigationTag}
                          onOpenTagChange={setOpenNavigationTag}
                          activeTag={activeTag}
                          activeOperationId={activeOperation?.id}
                          onNavigate={navigate}
                          onNavigateTag={navigateTag}
                          hrefForRoute={hrefForRoute}
                        />
                      </section>
                    );
                  })}
                  <NavigationTags
                    tags={ungroupedTags}
                    matches={matchesFilter}
                    searching={Boolean(normalizedFilter)}
                    openTag={openNavigationTag}
                    onOpenTagChange={setOpenNavigationTag}
                    activeTag={activeTag}
                    activeOperationId={activeOperation?.id}
                    onNavigate={navigate}
                    onNavigateTag={navigateTag}
                    hrefForRoute={hrefForRoute}
                  />
                </>
              ) : (
                <NavigationTags
                  tags={model.tags}
                  matches={matchesFilter}
                  searching={Boolean(normalizedFilter)}
                  openTag={openNavigationTag}
                  onOpenTagChange={setOpenNavigationTag}
                  activeTag={activeTag}
                  activeOperationId={activeOperation?.id}
                  onNavigate={navigate}
                  onNavigateTag={navigateTag}
                  hrefForRoute={hrefForRoute}
                />
              )}
              {normalizedFilter && filteredOperationCount === 0 && (
                <div className="sp-nav-empty">
                  <strong>No matching endpoints</strong>
                  <span>Try a path, method, or operation name.</span>
                </div>
              )}
              {!normalizedFilter && (
                <ReferenceNavigation
                  document={model.document}
                  activeKey={activeReference}
                  storageKey={`${storageScope}:navigation:reference`}
                  hrefFor={(key) =>
                    hrefForRoute({ page: 'reference', section: key })
                  }
                  onNavigate={navigateReference}
                />
              )}
            </div>
            <div className="sp-sidebar-search">
              <svg
                className="sp-filter-icon"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder="Filter endpoints"
                aria-label="Filter endpoints"
              />
              {filterQuery && (
                <button
                  type="button"
                  className="sp-search-clear"
                  onClick={() => setFilterQuery('')}
                  aria-label="Clear filter"
                >
                  ×
                </button>
              )}
            </div>
          </nav>
        </>
      )}
      <main className="sp-content">
        {!activeOperation && !activeReference && !activeTag && (
          <header className="sp-hero" id="sp-overview">
            <div className="sp-hero-intro">
              <div className="sp-eyebrow">
                API reference{' '}
                <span>
                  {model.document.info?.version ??
                    model.document.openapi ??
                    model.document.swagger}
                </span>
              </div>
              <h1>{model.document.info?.title ?? 'Untitled API'}</h1>
              <Markdown>{model.document.info?.description}</Markdown>
              {showInlineHints && (
                <InlineDiagnostics
                  diagnostics={overviewDiagnostics}
                  onHide={() => setShowInlineHints(false)}
                />
              )}
            </div>
            <aside className="sp-hero-aside">
              <OpenApiDownload document={result.document ?? model.document} />
              {model.document.servers?.map(
                (item, index) =>
                  item.url && (
                    <div className="sp-server" key={`${item.url}-${index}`}>
                      <span>{item.description ?? 'Base URL'}</span>
                      <code>{item.url}</code>
                      <CopyButton value={item.url} />
                    </div>
                  ),
              )}
              <SecurityRequirements
                requirements={model.document.security}
                schemes={model.document.components?.securitySchemes}
              />
            </aside>
          </header>
        )}
        {!activeOperation &&
          !activeReference &&
          !activeTag &&
          model.tags.map((tag) => {
            const visible = tag.operations;
            if (visible.length === 0) return null;
            return (
              <section
                className="sp-tag"
                id={`tag-${tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                key={tag.name}
              >
                <div className="sp-tag-heading">
                  <div>
                    <span className="sp-tag-kicker">Resource</span>
                    <h2 className="sp-tag-title">
                      <TagIcon tag={tag} />
                      {tag.name}
                    </h2>
                  </div>
                  <Markdown>{tag.description}</Markdown>
                </div>
                <div className="sp-operation-list">
                  {visible.map((item) => (
                    <OperationLink
                      item={item}
                      onNavigate={navigate}
                      hrefForRoute={hrefForRoute}
                      key={item.id}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        {activeTag && (
          <TagOverview
            tag={activeTag}
            operations={activeTag.operations}
            diagnostics={diagnostics}
            showInlineHints={showInlineHints}
            onHideInlineHints={() => setShowInlineHints(false)}
            onNavigate={navigate}
            hrefForRoute={hrefForRoute}
          />
        )}
        {activeOperation && (
          <section className="sp-endpoint-page">
            <button
              type="button"
              className="sp-back"
              onClick={() => navigate()}
            >
              ← API overview
            </button>
            <EndpointPage
              item={activeOperation}
              tag={model.tags.find((tag) => tag.name === activeOperation.tag)!}
              server={server}
              document={model.document}
              storageScope={storageScope}
              parameterPrototype={parameterPrototype}
              diagnostics={diagnostics}
              showInlineHints={showInlineHints}
              onHideInlineHints={() => setShowInlineHints(false)}
              onNavigateTag={navigateTag}
              hrefForRoute={hrefForRoute}
              key={activeOperation.id}
            />
          </section>
        )}
        {!activeOperation &&
          !activeReference &&
          !activeTag &&
          model.operations.length === 0 &&
          model.webhooks.length === 0 && (
            <div className="sp-empty">
              This spec doesn’t contain any operations yet.
            </div>
          )}
        {activeReference && (
          <section className="sp-endpoint-page">
            <button
              type="button"
              className="sp-back"
              onClick={() => navigate()}
            >
              ← API overview
            </button>
            <DocumentReference
              activeKey={activeReference}
              document={model.document}
            />
          </section>
        )}
      </main>
      {searchOpen && (
        <QuickSearch
          results={searchResults}
          onClose={() => setSearchOpen(false)}
        />
      )}
      {showDeveloperHints && (
        <DeveloperDiagnostics
          diagnostics={diagnostics}
          currentPageDiagnostics={
            activeOperation
              ? diagnostics.filter(
                  (diagnostic) => diagnostic.operationId === activeOperation.id,
                )
              : undefined
          }
          storageScope={storageScope}
          showInlineHints={showInlineHints}
          onShowInlineHintsChange={setShowInlineHints}
          routeForDiagnostic={routeForDiagnostic}
          hrefForRoute={hrefForRoute}
          onNavigate={navigateDiagnostic}
        />
      )}
    </div>
  );
}
