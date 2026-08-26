/**
 * ---
 * purpose: Provides the standalone API reference viewer with file, URL, paste, theme, and preview controls.
 * related:
 *   - ./sample.ts - Default document used for the first-run preview.
 *   - ./recentReferences.ts - Owns recent-reference identity and persistence.
 *   - ./previewUrls.ts - Creates and parses shareable preview links.
 *   - ./HomeScreen.tsx - Home screen shown when no reference is open.
 *   - ./Mark.tsx - Brand mark shown in the studio bar.
 *   - ./scoped.ts - Class-name scoping shared with the home screen.
 *   - ./App.module.css - Viewer chrome and reference workspace styling.
 *   - ./studio.css - Document-level studio styles.
 *   - speccy-renderer - Shared reference view embedded by the studio.
 * ---
 */

import { useEffect, useRef, useState } from 'react';
import {
  Speccy,
  ThemeToggle,
  type DiagnosticsIndexState,
  type OpenAPIDocument,
  type SpeccyRoute,
  type SpectralDiagnosticInput,
  type Theme,
} from 'speccy-renderer';
import { bundleFragmentedSpec, resolveExternalRefs } from 'speccy-core';
import { SAMPLE_SPEC } from './sample';
import { createApiHealthJobs } from './apiHealthIndex';
import { HomeScreen } from './HomeScreen';
import { parseInitialLocation, previewHref } from './previewUrls';
import {
  addRecentReference,
  readRecentReferences,
  recentReferenceLabel,
  type RecentReference,
  writeRecentReferences,
} from './recentReferences';
import { parseStudioRoute, referenceHref, type StudioRoute } from './routing';
import { Mark } from './Mark';
import { scoped } from './scoped';

declare global {
  interface DiscoveredRepository {
    name: string;
    path: string;
    documentCount: number;
  }

  interface Window {
    speccyLoadSpec?: (source: string, name?: string) => void;
    speccyLoadSpecBundle?: (
      sources: Record<string, string>,
      entrypoint: string,
    ) => void;
    speccySetDiscoveredRepositories?: (
      repositories: DiscoveredRepository[],
    ) => void;
    speccyDiscoveredRepositories?: DiscoveredRepository[];
    webkit?: {
      messageHandlers?: {
        speccyOpenRepository?: { postMessage(path: string): void };
      };
    };
  }
}

type InitialLocation = ReturnType<typeof parseInitialLocation>;
type HistoryMode = 'push' | 'replace';

const THEME_STORAGE_KEY = 'speccy-theme';
const URL_STORAGE_KEY = 'speccy-oas-url';
const THEMES: Theme[] = ['system', 'dark', 'light'];

function storageItem(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Browser storage is optional and may be unavailable or full.
  }
}

function storedTheme(): Theme {
  const theme = storageItem(THEME_STORAGE_KEY);
  return theme === 'light' || theme === 'dark' || theme === 'system'
    ? theme
    : 'system';
}

function ShareIcon() {
  return (
    <svg
      className={scoped('studio-share-icon')}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
    </svg>
  );
}

/** State and actions shared by the studio and the read-only preview. */
function useReferenceWorkspace(location: InitialLocation) {
  const [spec, setSpec] = useState<OpenAPIDocument | string>(
    () => location.source || (location.sourceUrl ? '' : SAMPLE_SPEC),
  );
  const [source, setSource] = useState(
    () => location.source || JSON.stringify(SAMPLE_SPEC, null, 2),
  );
  const [fileName, setFileName] = useState(() =>
    location.source ? (location.name ?? 'Shared API reference') : '',
  );
  const [sourceUrl, setSourceUrl] = useState(() => location.sourceUrl ?? '');
  const [activeId, setActiveId] = useState('');
  const [recents, setRecents] =
    useState<RecentReference[]>(readRecentReferences);
  const [discoveredRepositories, setDiscoveredRepositories] = useState<
    DiscoveredRepository[]
  >([]);
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState(() => storageItem(URL_STORAGE_KEY) ?? '');
  const [loading, setLoading] = useState(Boolean(location.sourceUrl));
  const [message, setMessage] = useState('');
  const [route, setRoute] = useState<StudioRoute>(() =>
    parseStudioRoute(window.location),
  );
  const recentsRef = useRef(recents);

  useEffect(() => {
    window.speccySetDiscoveredRepositories = setDiscoveredRepositories;
    if (window.speccyDiscoveredRepositories) {
      setDiscoveredRepositories(window.speccyDiscoveredRepositories);
    }
    return () => {
      delete window.speccySetDiscoveredRepositories;
    };
  }, []);

  useEffect(() => {
    storeItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.speccyLoadSpec = (nextSource, name) =>
      applySource(nextSource, name ?? 'Opened spec');
    return () => {
      delete window.speccyLoadSpec;
    };
  }, []);

  useEffect(() => {
    window.speccyLoadSpecBundle = (sources, entrypoint) => {
      const bundled = bundleFragmentedSpec(sources, entrypoint);
      applySource(
        JSON.stringify(bundled, null, 2),
        entrypoint.split('/').pop() ?? entrypoint,
      );
    };
    return () => {
      delete window.speccyLoadSpecBundle;
    };
  }, []);

  function setBrowserRoute(nextRoute: StudioRoute, mode: HistoryMode = 'push') {
    const href =
      nextRoute.page === 'reference'
        ? referenceHref(
            nextRoute.referenceId,
            nextRoute.referenceRoute,
            nextRoute.sourceUrl,
          )
        : '/';
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](
      {},
      '',
      href,
    );
    setRoute(nextRoute);
  }

  function showHome() {
    setFileName('');
    setActiveId('');
    setUrlOpen(false);
  }

  function displayReference(
    reference: RecentReference,
    renderedSpec: OpenAPIDocument | string = reference.source,
  ) {
    setSource(reference.source);
    setSpec(renderedSpec);
    setFileName(reference.name);
    setSourceUrl(reference.sourceUrl ?? '');
    setActiveId(reference.id);
    setMessage('');
  }

  function applySource(
    next: string,
    name = 'Pasted spec',
    existingId?: string,
    nextSourceUrl?: string,
    referenceRoute: SpeccyRoute = { page: 'overview' },
    historyMode: HistoryMode | false = 'push',
    renderedSpec?: OpenAPIDocument,
  ) {
    const current = existingId
      ? recentsRef.current.find((item) => item.id === existingId)
      : undefined;
    const { reference, references: updated } = addRecentReference(
      recentsRef.current,
      { name, source: next, sourceUrl: nextSourceUrl ?? current?.sourceUrl },
      existingId,
    );
    displayReference(reference, renderedSpec);
    recentsRef.current = updated;
    writeRecentReferences(updated);
    setRecents(updated);
    if (historyMode) {
      setBrowserRoute(
        {
          page: 'reference',
          referenceId: reference.id,
          referenceRoute,
          sourceUrl: reference.sourceUrl,
        },
        historyMode,
      );
    }
  }

  async function loadUrl(
    nextUrl: string,
    existingId?: string,
    referenceRoute: SpeccyRoute = { page: 'overview' },
    historyMode: HistoryMode | false = 'push',
    displayName?: string,
  ) {
    if (!nextUrl.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const document = await resolveExternalRefs(nextUrl, async (uri) => {
        const response = await fetch(uri);
        if (!response.ok)
          throw new Error(`The server returned ${response.status}.`);
        return response.text();
      });
      applySource(
        JSON.stringify(document, null, 2),
        displayName ?? new URL(nextUrl).pathname.split('/').pop() ?? nextUrl,
        existingId,
        nextUrl,
        referenceRoute,
        historyMode,
        document,
      );
      setUrl(nextUrl);
      storeItem(URL_STORAGE_KEY, nextUrl);
      setUrlOpen(false);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Couldn’t load that URL.',
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    spec,
    source,
    fileName,
    sourceUrl,
    activeId,
    recents,
    recentsRef,
    discoveredRepositories,
    theme,
    setTheme,
    urlOpen,
    setUrlOpen,
    url,
    setUrl,
    loading,
    message,
    setMessage,
    route,
    setRoute,
    setBrowserRoute,
    showHome,
    displayReference,
    applySource,
    loadUrl,
  };
}

export function App() {
  const [location] = useState(() => parseInitialLocation(window.location));
  return location.preview ? (
    <PreviewApp location={location} />
  ) : (
    <StudioApp location={location} />
  );
}

function PreviewApp({ location }: { location: InitialLocation }) {
  const {
    spec,
    source,
    fileName,
    sourceUrl,
    theme,
    setTheme,
    loading,
    route,
    setRoute,
    setUrl,
    loadUrl,
  } = useReferenceWorkspace(location);

  useEffect(() => {
    const initialUrl = location.sourceUrl ?? '';
    if (!initialUrl) return;
    setUrl(initialUrl);
    void loadUrl(initialUrl, undefined, { page: 'overview' }, false);
  }, []);

  const referenceRoute =
    route.page === 'reference'
      ? route.referenceRoute
      : ({ page: 'overview' } satisfies SpeccyRoute);

  function hrefForRoute(nextRoute: SpeccyRoute) {
    return previewHref(
      nextRoute,
      {
        source,
        sourceUrl: sourceUrl || undefined,
        name: fileName,
        tryIt: location.tryIt,
      },
      window.location.origin,
    );
  }

  function navigate(nextRoute: SpeccyRoute) {
    window.history.pushState({}, '', hrefForRoute(nextRoute));
    setRoute({
      page: 'reference',
      referenceId: 'preview',
      referenceRoute: nextRoute,
    });
  }

  return (
    <main className={scoped(`studio studio-preview-only studio-${theme}`)}>
      <ThemeToggle
        className={scoped('studio-preview-theme')}
        theme={theme}
        onChange={setTheme}
        themes={THEMES}
        label="current"
      />
      {loading ? (
        <div className={scoped('studio-preview-loading')}>
          Loading API reference…
        </div>
      ) : (
        <Speccy
          spec={spec}
          theme={theme}
          showThemeToggle={false}
          route={referenceRoute}
          onNavigate={navigate}
          hrefForRoute={hrefForRoute}
          parameterPrototype
          tryIt={location.tryIt}
        />
      )}
    </main>
  );
}

function useSpectralDiagnostics(
  spec: OpenAPIDocument | string,
  fileName: string,
  referenceRoute: SpeccyRoute,
) {
  const [spectralDiagnostics, setSpectralDiagnostics] = useState<
    SpectralDiagnosticInput[]
  >([]);
  const [diagnosticsIndexState, setDiagnosticsIndexState] =
    useState<DiagnosticsIndexState>({ phase: 'idle' });
  const diagnosticsRun = useRef(0);
  const referenceRouteRef = useRef(referenceRoute);
  referenceRouteRef.current = referenceRoute;

  useEffect(() => {
    const run = ++diagnosticsRun.current;
    setSpectralDiagnostics([]);
    setDiagnosticsIndexState({ phase: 'idle' });
    if (!fileName) return;

    const start = async () => {
      try {
        const jobs = createApiHealthJobs(spec, referenceRouteRef.current);
        const pageJobs = jobs.filter((job) => job.currentPage).length;
        const { runSpectral } = await import('speccy-spectral');
        const findings = new Map<string, SpectralDiagnosticInput>();
        setDiagnosticsIndexState({
          phase: 'page',
          completed: 0,
          total: jobs.length,
        });
        for (const [index, job] of jobs.entries()) {
          if (run !== diagnosticsRun.current) return;
          const next = (await runSpectral(job.document())).filter(job.accepts);
          for (const finding of next) {
            const key = `${finding.code}:${finding.path?.join('.') ?? ''}:${finding.message}`;
            findings.set(key, finding);
          }
          if (run !== diagnosticsRun.current) return;
          setSpectralDiagnostics([...findings.values()]);
          setDiagnosticsIndexState({
            phase: index + 1 < pageJobs ? 'page' : 'all',
            completed: index + 1,
            total: jobs.length,
          });
          await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        }
        if (run === diagnosticsRun.current)
          setDiagnosticsIndexState({
            phase: 'complete',
            completed: jobs.length,
            total: jobs.length,
          });
      } catch {
        if (run === diagnosticsRun.current)
          setDiagnosticsIndexState({ phase: 'error' });
      }
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const handle = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(() => void start())
      : window.setTimeout(() => void start(), 100);
    return () => {
      diagnosticsRun.current += 1;
      if (idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [spec, fileName]);

  return { spectralDiagnostics, diagnosticsIndexState };
}

function StudioApp({ location }: { location: InitialLocation }) {
  const {
    spec,
    source,
    fileName,
    sourceUrl,
    activeId,
    recents,
    recentsRef,
    discoveredRepositories,
    theme,
    setTheme,
    urlOpen,
    setUrlOpen,
    url,
    setUrl,
    loading,
    message,
    setMessage,
    route,
    setRoute,
    setBrowserRoute,
    showHome,
    displayReference,
    applySource,
    loadUrl,
  } = useReferenceWorkspace(location);
  const [shareMessage, setShareMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const restoredInitialRoute = useRef(false);

  useEffect(() => {
    const restoreReference = (
      nextRoute: Extract<StudioRoute, { page: 'reference' }>,
    ) => {
      const reference = recentsRef.current.find(
        (item) => item.id === nextRoute.referenceId,
      );
      if (reference) {
        displayReference(reference);
      } else if (nextRoute.sourceUrl) {
        void loadUrl(
          nextRoute.sourceUrl,
          nextRoute.referenceId,
          nextRoute.referenceRoute,
          'replace',
        );
      } else {
        showHome();
        setMessage(
          'That reference is only available on the device where it was opened.',
        );
      }
    };

    const restoreLocation = () => {
      const nextRoute = parseStudioRoute(window.location);
      setRoute(nextRoute);
      switch (nextRoute.page) {
        case 'home':
          showHome();
          return;
        case 'open':
          void loadUrl(
            nextRoute.url,
            undefined,
            { page: 'overview' },
            'replace',
          );
          return;
        case 'reference':
          restoreReference(nextRoute);
          return;
      }
    };

    window.addEventListener('popstate', restoreLocation);
    if (!restoredInitialRoute.current) {
      restoredInitialRoute.current = true;
      restoreLocation();
    }
    return () => window.removeEventListener('popstate', restoreLocation);
  }, []);

  const referenceRoute =
    route.page === 'reference' && route.referenceId === activeId
      ? route.referenceRoute
      : ({ page: 'overview' } satisfies SpeccyRoute);
  const { spectralDiagnostics, diagnosticsIndexState } = useSpectralDiagnostics(
    spec,
    fileName,
    referenceRoute,
  );

  function openRecent(reference: RecentReference) {
    applySource(
      reference.source,
      reference.name,
      reference.id,
      reference.sourceUrl,
    );
  }

  function openSample() {
    applySource(JSON.stringify(SAMPLE_SPEC, null, 2), 'Luma Library API');
  }

  function goHome() {
    showHome();
    setBrowserRoute({ page: 'home' });
  }

  async function loadFile(file?: File) {
    if (!file) return;
    applySource(await file.text(), file.name);
  }

  function hrefForRoute(nextRoute: SpeccyRoute) {
    return referenceHref(activeId, nextRoute, sourceUrl || undefined);
  }

  function navigate(nextRoute: SpeccyRoute) {
    setBrowserRoute({
      page: 'reference',
      referenceId: activeId,
      referenceRoute: nextRoute,
      sourceUrl: sourceUrl || undefined,
    });
  }

  async function sharePreview() {
    const link = previewHref(
      { page: 'overview' },
      { source, sourceUrl: sourceUrl || undefined, name: fileName },
      window.location.origin,
      true,
    );
    try {
      await navigator.clipboard.writeText(link);
      setShareMessage('Preview link copied');
    } catch {
      window.prompt('Copy this preview link', link);
    }
  }

  const screen = fileName
    ? {
        title: (
          <label className={scoped('studio-switcher')}>
            <span className={scoped('studio-dot')} />
            <select
              aria-label="Switch API reference"
              value={activeId}
              onChange={(event) => {
                const reference = recents.find(
                  (item) => item.id === event.target.value,
                );
                if (reference) openRecent(reference);
              }}
            >
              {recents.map((reference) => (
                <option key={reference.id} value={reference.id}>
                  {recentReferenceLabel(reference, recents)}
                </option>
              ))}
            </select>
            <span className={scoped('studio-chevron')} aria-hidden="true">
              ⌄
            </span>
          </label>
        ),
        actions: (
          <>
            <button
              className={scoped('studio-action-share')}
              type="button"
              onClick={() => void sharePreview()}
              aria-label="Copy preview link"
              title={shareMessage || 'Copy preview link'}
            >
              <ShareIcon />
              <span className={scoped('studio-share-label')}>Share</span>
            </button>
            <button
              className={scoped('studio-action-url')}
              type="button"
              onClick={() => setUrlOpen(!urlOpen)}
            >
              <span>Load URL</span>
            </button>
            <button
              className={scoped('studio-action-file')}
              type="button"
              onClick={() => fileInput.current?.click()}
            >
              <span>Open file</span>
            </button>
          </>
        ),
        body: (
          <div className={scoped('studio-workspace')}>
            <div className={scoped('studio-preview')}>
              <Speccy
                spec={spec}
                theme={theme}
                showThemeToggle={false}
                showDeveloperHints
                spectralDiagnostics={spectralDiagnostics}
                diagnosticsIndexState={diagnosticsIndexState}
                route={referenceRoute}
                onNavigate={navigate}
                hrefForRoute={hrefForRoute}
                parameterPrototype
              />
            </div>
          </div>
        ),
      }
    : {
        title: (
          <div className={scoped('studio-document')}>Your API references</div>
        ),
        actions: null,
        body: (
          <HomeScreen
            discoveredRepositories={discoveredRepositories}
            recents={recents}
            loading={loading}
            message={message}
            onOpenFile={() => fileInput.current?.click()}
            onOpenUrl={() => setUrlOpen(true)}
            onOpenSample={openSample}
            onOpenCatalogApi={(api) =>
              void loadUrl(
                api.sourceUrl,
                undefined,
                { page: 'overview' },
                'push',
                api.name,
              )
            }
            onOpenRecent={openRecent}
          />
        ),
      };

  return (
    <div
      className={scoped(`studio studio-${theme}`)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void loadFile(event.dataTransfer.files[0]);
      }}
    >
      <header className={scoped('studio-bar')}>
        <button
          className={scoped('studio-logo')}
          type="button"
          onClick={goHome}
          aria-label="Speccy home"
        >
          <Mark />
          <span>Speccy</span>
        </button>
        {screen.title}
        <div className={scoped('studio-actions')}>
          {screen.actions}
          <ThemeToggle
            className={scoped('studio-theme')}
            theme={theme}
            onChange={setTheme}
            themes={THEMES}
            label="current"
          />
          <input
            ref={fileInput}
            type="file"
            accept=".yaml,.yml,.json,application/json,text/yaml"
            hidden
            onChange={(event) => void loadFile(event.target.files?.[0])}
          />
        </div>
      </header>

      {urlOpen && (
        <form
          className={scoped('studio-url')}
          onSubmit={(event) => {
            event.preventDefault();
            void loadUrl(url);
          }}
        >
          <label htmlFor="spec-url">OpenAPI document URL</label>
          <input
            id="spec-url"
            type="url"
            placeholder="https://example.com/openapi.yaml"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            autoFocus
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Loading…' : 'Load'}
          </button>
          <button type="button" onClick={() => setUrlOpen(false)}>
            Cancel
          </button>
          {message && (
            <span className={scoped('studio-message')}>{message}</span>
          )}
        </form>
      )}

      {screen.body}
    </div>
  );
}
