/**
 * ---
 * purpose: Renders a complete, searchable OpenAPI reference from the normalized model.
 * related:
 *   - ../../core/src/model.ts - Parses input and builds tag and operation groups.
 *   - ./SidebarNavigation.tsx - Owns the sidebar, endpoint filter, and tag groups.
 *   - ./OverviewPage.tsx - Owns the API overview page.
 *   - ./EndpointPage.tsx - Owns the endpoint and webhook detail page.
 *   - ./QuickSearch.tsx - Owns searchable keyboard navigation.
 *   - ./Speccy.module.css - Owns component-specific renderer styles.
 *   - ./styles.css - Owns the visual system and responsive layout.
 *   - ./types.ts - Declares the public component API.
 * ---
 */

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  analyzeOpenApi,
  createReferenceModel,
  expandServerUrl,
  parseSpec,
  slugify,
  type ApiDiagnostic,
  type OpenAPIDocument,
  type OperationModel,
  type TagModel,
} from 'speccy-core';
import { httpMethodLabel } from './DesignSystem';
import { DeveloperDiagnostics } from './DeveloperDiagnostics';
import { EndpointPage } from './EndpointPage';
import { OverviewPage } from './OverviewPage';
import { QuickSearch, type SearchResult } from './QuickSearch';
import {
  componentAnchorId,
  DocumentReference,
  REFERENCE_GROUPS,
  type ReferenceKey,
} from './ReferenceSections';
import { parseRoutePath, routePath } from './routing';
import { SidebarNavigation } from './SidebarNavigation';
import styles from './Speccy.module.css';
import { TagOverview } from './TagOverview';
import { ThemeToggle, type Theme } from './ThemeToggle';
import type { SpeccyProps, SpeccyRoute } from './types';
import { useLocalState } from './useLocalState';
import { tagSlug } from './operationSummary';
import { WebhookReference } from './WebhookReference';

type ReferenceModel = ReturnType<typeof createReferenceModel>;

type ActivePage =
  | { kind: 'overview' }
  | { kind: 'tag'; tag: TagModel }
  | { kind: 'operation'; item: OperationModel }
  | { kind: 'reference'; section: ReferenceKey };

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

function resolveActivePage(
  activeRoute: string | undefined,
  model: ReferenceModel,
  operations: OperationModel[],
): ActivePage {
  if (activeRoute?.startsWith('reference/'))
    return {
      kind: 'reference',
      section: activeRoute.slice('reference/'.length) as ReferenceKey,
    };
  if (activeRoute?.startsWith('tags/')) {
    const slug = activeRoute.slice('tags/'.length);
    const tag = model.tags.find((candidate) => tagSlug(candidate) === slug);
    return tag ? { kind: 'tag', tag } : { kind: 'overview' };
  }
  const item = operations.find((candidate) => candidate.id === activeRoute);
  return item ? { kind: 'operation', item } : { kind: 'overview' };
}

function pageRoute(page: ActivePage): SpeccyRoute {
  switch (page.kind) {
    case 'operation':
      return { page: 'operation', operationId: page.item.id };
    case 'tag':
      return { page: 'tag', tag: tagSlug(page.tag) };
    case 'reference':
      return { page: 'reference', section: page.section };
    case 'overview':
      return { page: 'overview' };
  }
}

function pageDiagnostics(
  page: ActivePage,
  diagnostics: ApiDiagnostic[],
): ApiDiagnostic[] | undefined {
  switch (page.kind) {
    case 'operation':
      return diagnostics.filter(
        (diagnostic) => diagnostic.operationId === page.item.id,
      );
    case 'tag':
      return diagnostics.filter(
        (diagnostic) => diagnostic.tag === page.tag.name,
      );
    case 'reference':
      if (page.section === 'webhooks')
        return diagnostics.filter(
          (diagnostic) => diagnostic.path[0] === 'webhooks',
        );
      return diagnostics.filter(
        (diagnostic) =>
          diagnostic.path[0] === 'components' &&
          diagnostic.path[1] === page.section,
      );
    case 'overview':
      return undefined;
  }
}

function DetailPage({
  onBack,
  children,
}: {
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <section className="sp-endpoint-page">
      <button type="button" className="sp-back" onClick={onBack}>
        ← API overview
      </button>
      {children}
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
  showApiVersion = true,
  singleExpandedSidebarGroup = false,
  wrapSidebarLabels = false,
  showThemeToggle = true,
  theme = 'system',
  accentColor = '#6d5dfc',
  logo,
  basePath: basePathProp = '/',
  route,
  initialRoute,
  onNavigate,
  hrefForRoute: controlledHrefForRoute,
  onError,
  showDeveloperHints = false,
  previousSpec,
  spectralDiagnostics,
  diagnosticsIndexState,
  onRequestDiagnostics,
  parameterPrototype = true,
  tryIt = true,
  openApiUrl,
  postmanCollectionUrl,
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
    if (
      !showDeveloperHints ||
      !result.document ||
      diagnosticsIndexState?.phase === 'idle'
    )
      return [];
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
  }, [
    showDeveloperHints,
    result.document,
    previousSpec,
    spectralDiagnostics,
    diagnosticsIndexState?.phase,
  ]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useLocalState<Theme>(
    'speccy:theme',
    theme,
  );
  const themeControlVisible = showThemeToggle && theme !== 'inherit';
  const activeTheme = themeControlVisible ? selectedTheme : theme;
  const basePath = basePathProp;
  const storageScope = `speccy:${basePath || '/'}:${result.model?.document.info?.title ?? 'api'}`;
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnosticsScope, setDiagnosticsScope] = useState<'page' | 'all'>(
    'all',
  );
  const viewAllDiagnostics = () => {
    setDiagnosticsScope('all');
    setDiagnosticsOpen(true);
  };
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
  const [internalRoute, setInternalRoute] = useState(
    () =>
      routeFromPath() ?? (initialRoute ? routeKey(initialRoute) : undefined),
  );
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
  const title = model.document.info?.title ?? 'API reference';
  const rootServer = model.document.servers?.[0];
  const server = rootServer?.url
    ? expandServerUrl(rootServer.url, rootServer.variables)
    : '';
  const allOperations = [...model.operations, ...model.webhooks];
  const page = resolveActivePage(activeRoute, model, allOperations);
  const activeTag = page.kind === 'tag' ? page.tag : undefined;
  const activeOperationId =
    page.kind === 'operation' ? page.item.id : undefined;
  const activeReference = page.kind === 'reference' ? page.section : undefined;
  const currentPageDiagnostics = pageDiagnostics(page, diagnostics);
  const style = { '--sp-accent': accentColor } as CSSProperties;

  function routeForDiagnostic(diagnostic: ApiDiagnostic): SpeccyRoute {
    const [root, name, method] = diagnostic.path;
    if (
      (root === 'paths' || root === 'webhooks') &&
      typeof name === 'string' &&
      typeof method === 'string'
    ) {
      const operation = allOperations.find(
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

  function goTo(nextRoute: SpeccyRoute, anchor?: string) {
    if (onNavigate) onNavigate(nextRoute);
    else {
      window.history.pushState(
        {},
        '',
        `${hrefForRoute(nextRoute)}${anchor ? `#${anchor}` : ''}`,
      );
      setInternalRoute(routeKey(nextRoute));
    }
    if (anchor)
      requestAnimationFrame(() =>
        document.getElementById(anchor)?.scrollIntoView({ block: 'start' }),
      );
    else rootRef.current?.scrollIntoView({ block: 'start' });
    setMobileNavigationOpen(false);
  }

  const navigate = (operationId?: string) =>
    goTo(
      operationId ? { page: 'operation', operationId } : { page: 'overview' },
    );
  const navigateTag = (tag: TagModel) =>
    goTo({ page: 'tag', tag: tagSlug(tag) });
  const navigateReference = (key: ReferenceKey, component?: string) =>
    goTo(
      { page: 'reference', section: key },
      component ? componentAnchorId(key, component) : undefined,
    );

  const searchResults: SearchResult[] = [
    {
      id: 'overview',
      group: 'Pages',
      label: 'API overview',
      terms: ['api overview', model.document.info?.title ?? ''],
      navigate: () => navigate(),
    },
    ...(model.webhooks.length > 0
      ? [
          {
            id: 'reference-webhooks',
            group: 'Pages' as const,
            label: 'Webhooks',
            detail: `${model.webhooks.length} event${model.webhooks.length === 1 ? '' : 's'}`,
            terms: ['webhooks', 'events'],
            navigate: () => navigateReference('webhooks'),
          },
        ]
      : []),
    ...model.tags.map((tag) => ({
      id: `tag-${tagSlug(tag)}`,
      group: 'Tags' as const,
      label: tag.name,
      detail: `${tag.operations.length} endpoint${tag.operations.length === 1 ? '' : 's'}`,
      terms: [tag.name, tag.description ?? '', tag.longDescription ?? ''],
      navigate: () => navigateTag(tag),
    })),
    ...allOperations.map((item) => ({
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

  const infoIcon = model.document.info?.['x-icon'];
  const brandLogo =
    logo ??
    (infoIcon?.url ? (
      <img
        className={styles.brandIcon}
        src={infoIcon.url}
        alt={infoIcon.alt ?? ''}
      />
    ) : null);

  return (
    <div
      ref={rootRef}
      className={`speccy sp-theme-${activeTheme} ${showSidebar ? 'sp-with-sidebar' : ''} ${wrapSidebarLabels ? 'sp-nav-wrapped-labels' : ''} ${className}`}
      style={style}
    >
      {themeControlVisible && (
        <ThemeToggle theme={selectedTheme} onChange={setSelectedTheme} />
      )}
      {showSidebar && (
        <SidebarNavigation
          model={model}
          title={title}
          brandLogo={brandLogo}
          singleExpanded={singleExpandedSidebarGroup}
          activeRoute={activeRoute}
          activeTag={activeTag}
          activeOperationId={activeOperationId}
          activeReference={activeReference}
          mobileOpen={mobileNavigationOpen}
          onMobileOpenChange={setMobileNavigationOpen}
          onNavigate={navigate}
          onNavigateTag={navigateTag}
          onNavigateReference={navigateReference}
          hrefForRoute={hrefForRoute}
          storageScope={storageScope}
        />
      )}
      <main className="sp-content">
        {page.kind === 'overview' && (
          <OverviewPage
            model={model}
            showApiVersion={showApiVersion}
            diagnostics={diagnostics}
            onViewAllDiagnostics={viewAllDiagnostics}
            openApiUrl={openApiUrl}
            postmanCollectionUrl={postmanCollectionUrl}
            onNavigate={navigate}
            hrefForRoute={hrefForRoute}
          />
        )}
        {page.kind === 'tag' && (
          <TagOverview
            tag={page.tag}
            operations={page.tag.operations}
            diagnostics={diagnostics}
            onViewAllDiagnostics={viewAllDiagnostics}
            onNavigate={navigate}
            hrefForRoute={hrefForRoute}
          />
        )}
        {page.kind === 'operation' && (
          <DetailPage onBack={() => navigate()}>
            <EndpointPage
              item={page.item}
              tag={model.tags.find((tag) => tag.name === page.item.tag)!}
              server={server}
              document={model.document}
              storageScope={storageScope}
              parameterPrototype={parameterPrototype}
              tryIt={tryIt}
              diagnostics={diagnostics}
              onViewAllDiagnostics={viewAllDiagnostics}
              onNavigateTag={navigateTag}
              hrefForRoute={hrefForRoute}
              operations={allOperations}
              onNavigateOperation={navigate}
              key={page.item.id}
            />
          </DetailPage>
        )}
        {page.kind === 'reference' && (
          <DetailPage onBack={() => navigate()}>
            {page.section === 'webhooks' ? (
              <WebhookReference
                webhooks={model.webhooks}
                diagnostics={currentPageDiagnostics}
                onViewAllDiagnostics={viewAllDiagnostics}
                onNavigate={navigate}
                hrefForRoute={hrefForRoute}
              />
            ) : (
              <DocumentReference
                activeKey={page.section}
                document={model.document}
              />
            )}
          </DetailPage>
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
          currentPageDiagnostics={currentPageDiagnostics}
          storageScope={storageScope}
          open={diagnosticsOpen}
          onOpenChange={setDiagnosticsOpen}
          scope={diagnosticsScope}
          onScopeChange={setDiagnosticsScope}
          routeForDiagnostic={routeForDiagnostic}
          hrefForRoute={hrefForRoute}
          onNavigate={goTo}
          indexState={diagnosticsIndexState}
          onRequestDiagnostics={() => onRequestDiagnostics?.(pageRoute(page))}
        />
      )}
    </div>
  );
}
