/**
 * ---
 * purpose: Provides the standalone API reference viewer with file, URL, paste, theme, and preview controls.
 * related:
 *   - ./sample.ts - Default document used for the first-run preview.
 *   - ./studio.css - Viewer chrome and reference workspace styling.
 *   - ../../../packages/renderer/src/Speccy.tsx - Shared reference view embedded by the studio.
 * ---
 */

import { useEffect, useRef, useState } from 'react';
import type { OpenAPIDocument, SpeccyRoute, SpectralDiagnosticInput } from '@speccy/renderer';
import { Speccy } from '../../../packages/renderer/src/Speccy';
import { bundleFragmentedSpec, parseSpec } from 'speccy-core';
import { SAMPLE_SPEC } from './sample';
import { parseStudioRoute, referenceHref, type StudioRoute } from './routing';

declare global {
  interface Window {
    speccyLoadSpec?: (source: string, name?: string) => void;
    speccyLoadSpecBundle?: (sources: Record<string, string>, entrypoint: string) => void;
  }
}

type Theme = 'light' | 'dark' | 'system';

type RecentReference = {
  id: string;
  name: string;
  source: string;
  sourceUrl?: string;
  openedAt: number;
};

const THEME_STORAGE_KEY = 'speccy-theme';
const URL_STORAGE_KEY = 'speccy-oas-url';
const RECENTS_STORAGE_KEY = 'speccy-recent-references';
const MAX_RECENTS = 6;

type InitialLocation = {
  preview: boolean;
  source?: string;
  name?: string;
  url?: string;
};

function initialLocation(): InitialLocation {
  const search = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return {
    preview: search.get('preview') === '1',
    source: fragment.get('source') ?? undefined,
    name: fragment.get('name') ?? undefined,
    url: search.get('url') ?? undefined,
  };
}

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
  return theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system';
}

function storedRecents(): RecentReference[] {
  try {
    const references = JSON.parse(storageItem(RECENTS_STORAGE_KEY) ?? '[]');
    return Array.isArray(references) ? references.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function referenceId(name: string, openedAt: number) {
  return `${name}-${openedAt}`;
}

function referenceLabel(reference: RecentReference, references: RecentReference[]) {
  if (references.filter((item) => item.name === reference.name).length < 2) return reference.name;
  const imported = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(reference.openedAt);
  return `${reference.name} — ${imported}`;
}

function Mark() {
  return (
    <span className="studio-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M3.5 9.5 5 7.75M20.5 9.5 19 7.75M9.5 11.5h5" />
        <circle cx="6.5" cy="13" r="3.5" />
        <circle cx="17.5" cy="13" r="3.5" />
      </svg>
    </span>
  );
}

function ShareIcon() {
  return <svg className="studio-share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></svg>;
}

export function App() {
  const [location] = useState(initialLocation);
  const [spec, setSpec] = useState<OpenAPIDocument | string>(() => location.source ?? (location.url ? '' : SAMPLE_SPEC));
  const [source, setSource] = useState(() => location.source ?? JSON.stringify(SAMPLE_SPEC, null, 2));
  const [fileName, setFileName] = useState(() => location.source ? (location.name ?? 'Shared API reference') : '');
  const [sourceUrl, setSourceUrl] = useState(() => location.url ?? '');
  const [activeId, setActiveId] = useState('');
  const [recents, setRecents] = useState<RecentReference[]>(storedRecents);
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState(() => storageItem(URL_STORAGE_KEY) ?? '');
  const [loading, setLoading] = useState(Boolean(location.url));
  const [message, setMessage] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [route, setRoute] = useState<StudioRoute>(() => parseStudioRoute(window.location));
  const [spectralDiagnostics, setSpectralDiagnostics] = useState<SpectralDiagnosticInput[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const recentsRef = useRef(recents);
  const restoredInitialRoute = useRef(false);

  useEffect(() => {
    let active = true;
    if (location.preview || !fileName) {
      setSpectralDiagnostics([]);
      return () => { active = false; };
    }
    void import('./spectral').then(({ runSpectral }) => runSpectral(parseSpec(spec))).then((findings) => { if (active) setSpectralDiagnostics(findings); }).catch(() => { if (active) setSpectralDiagnostics([]); });
    return () => { active = false; };
  }, [spec, fileName, location.preview]);

  useEffect(() => {
    if (location.preview) {
      const initialUrl = location.url ?? '';
      if (initialUrl) {
        setUrl(initialUrl);
        void loadUrl(initialUrl, undefined, { page: 'overview' }, false);
      }
      return;
    }

    const restoreLocation = () => {
      const nextRoute = parseStudioRoute(window.location);
      setRoute(nextRoute);
      if (nextRoute.page === 'home') {
        showHome();
        return;
      }
      if (nextRoute.page === 'open') {
        void loadUrl(nextRoute.url, undefined, { page: 'overview' }, 'replace');
        return;
      }

      const reference = recentsRef.current.find((item) => item.id === nextRoute.referenceId);
      if (reference) {
        displayReference(reference);
      } else if (nextRoute.sourceUrl) {
        void loadUrl(nextRoute.sourceUrl, nextRoute.referenceId, nextRoute.referenceRoute, 'replace');
      } else {
        showHome();
        setMessage('That reference is only available on the device where it was opened.');
      }
    };

    window.addEventListener('popstate', restoreLocation);
    if (!restoredInitialRoute.current) {
      restoredInitialRoute.current = true;
      restoreLocation();
    }
    return () => window.removeEventListener('popstate', restoreLocation);
  }, []);

  useEffect(() => {
    storeItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.speccyLoadSpec = (nextSource, name) => applySource(nextSource, name ?? 'Opened spec');
    return () => { delete window.speccyLoadSpec; };
  }, []);

  useEffect(() => {
    window.speccyLoadSpecBundle = (sources, entrypoint) => {
      const bundled = bundleFragmentedSpec(sources, entrypoint);
      applySource(JSON.stringify(bundled, null, 2), entrypoint.split('/').pop() ?? entrypoint);
    };
    return () => { delete window.speccyLoadSpecBundle; };
  }, []);

  function setBrowserRoute(nextRoute: StudioRoute, mode: 'push' | 'replace' = 'push') {
    const href = nextRoute.page === 'reference'
      ? referenceHref(nextRoute.referenceId, nextRoute.referenceRoute, nextRoute.sourceUrl)
      : '/';
    window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', href);
    setRoute(nextRoute);
  }

  function showHome() {
    setFileName('');
    setActiveId('');
    setUrlOpen(false);
  }

  function displayReference(reference: RecentReference) {
    setSource(reference.source);
    setSpec(reference.source);
    setFileName(reference.name);
    setSourceUrl(reference.sourceUrl ?? '');
    setActiveId(reference.id);
    setMessage('');
  }

  function applySource(
    next: string,
    name = 'Pasted spec',
    existingId?: string,
    nextSourceUrl?: string | null,
    referenceRoute: SpeccyRoute = { page: 'overview' },
    historyMode: 'push' | 'replace' | false = 'push',
  ) {
    const existing = existingId
      ? recentsRef.current.find((item) => item.id === existingId)
      : recentsRef.current.find((item) => item.name === name && item.source === next);
    const openedAt = existing?.openedAt ?? Date.now();
    const id = existing?.id ?? existingId ?? referenceId(name, openedAt);
    const reference = { id, name, source: next, sourceUrl: nextSourceUrl === null ? undefined : nextSourceUrl ?? existing?.sourceUrl, openedAt };
    displayReference(reference);
    const updated = [reference, ...recentsRef.current.filter((item) => item.id !== id)].slice(0, MAX_RECENTS);
    recentsRef.current = updated;
    storeItem(RECENTS_STORAGE_KEY, JSON.stringify(updated));
    setRecents(updated);
    if (historyMode) {
      setBrowserRoute({ page: 'reference', referenceId: id, referenceRoute, sourceUrl: reference.sourceUrl }, historyMode);
    }
  }

  function openRecent(reference: RecentReference) {
    applySource(reference.source, reference.name, reference.id, reference.sourceUrl);
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

  async function loadUrl(
    nextUrl: string,
    existingId?: string,
    referenceRoute: SpeccyRoute = { page: 'overview' },
    historyMode: 'push' | 'replace' | false = 'push',
  ) {
    if (!nextUrl.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(nextUrl);
      if (!response.ok) throw new Error(`The server returned ${response.status}.`);
      applySource(
        await response.text(),
        new URL(nextUrl).pathname.split('/').pop() || nextUrl,
        existingId,
        nextUrl,
        referenceRoute,
        historyMode,
      );
      setUrl(nextUrl);
      storeItem(URL_STORAGE_KEY, nextUrl);
      setUrlOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Couldn’t load that URL.');
    } finally {
      setLoading(false);
    }
  }

  const referenceRoute = route.page === 'reference' && (route.referenceId === activeId || location.preview)
    ? route.referenceRoute
    : { page: 'overview' } satisfies SpeccyRoute;

  function rendererHref(nextRoute: SpeccyRoute) {
    if (!location.preview) return referenceHref(activeId, nextRoute, sourceUrl || undefined);
    const target = new URL(referenceHref('preview', nextRoute), window.location.origin);
    target.searchParams.set('preview', '1');
    if (sourceUrl) target.searchParams.set('url', sourceUrl);
    else target.hash = new URLSearchParams({ source, name: fileName || 'API reference' }).toString();
    return `${target.pathname}${target.search}${target.hash}`;
  }

  function navigateRenderer(nextRoute: SpeccyRoute) {
    if (location.preview) {
      window.history.pushState({}, '', rendererHref(nextRoute));
      setRoute({ page: 'reference', referenceId: 'preview', referenceRoute: nextRoute });
      return;
    }
    setBrowserRoute({ page: 'reference', referenceId: activeId, referenceRoute: nextRoute, sourceUrl: sourceUrl || undefined });
  }

  function previewUrl() {
    const preview = new URL(referenceHref('preview', { page: 'overview' }), window.location.origin);
    preview.search = '';
    preview.hash = '';
    preview.searchParams.set('preview', '1');
    if (sourceUrl) {
      preview.searchParams.set('url', sourceUrl);
    } else {
      const fragment = new URLSearchParams({ source, name: fileName || 'API reference' });
      preview.hash = fragment.toString();
    }
    return preview.toString();
  }

  async function sharePreview() {
    const link = previewUrl();
    try {
      await navigator.clipboard.writeText(link);
      setShareMessage('Preview link copied');
    } catch {
      window.prompt('Copy this preview link', link);
    }
  }

  function cycleTheme() {
    setTheme(theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system');
  }

  if (location.preview) {
    return (
      <main className={`studio studio-preview-only studio-${theme}`}>
        <button className="studio-preview-theme" type="button" onClick={cycleTheme} aria-label={`Theme: ${theme}`} title={`Theme: ${theme}`}>{theme === 'dark' ? '◐' : theme === 'light' ? '○' : '◒'}</button>
        {loading ? <div className="studio-preview-loading">Loading API reference…</div> : <Speccy spec={spec} theme={theme} showThemeToggle={false} route={referenceRoute} onNavigate={navigateRenderer} hrefForRoute={rendererHref} parameterPrototype />}
      </main>
    );
  }

  return (
    <div className={`studio studio-${theme}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void loadFile(event.dataTransfer.files[0]); }}>
      <header className="studio-bar">
        <button className="studio-logo" type="button" onClick={goHome} aria-label="Speccy home"><Mark /><span>Speccy</span></button>
        {fileName ? (
          <label className="studio-switcher">
            <span className="studio-dot" />
            <select aria-label="Switch API reference" value={activeId} onChange={(event) => {
              const reference = recents.find((item) => item.id === event.target.value);
              if (reference) openRecent(reference);
            }}>
              {recents.map((reference) => <option key={reference.id} value={reference.id}>{referenceLabel(reference, recents)}</option>)}
            </select>
            <span className="studio-chevron" aria-hidden="true">⌄</span>
          </label>
        ) : <div className="studio-document">Your API references</div>}
        <div className="studio-actions">
          {fileName && <button className="studio-action-share" type="button" onClick={() => void sharePreview()} aria-label="Copy preview link" title={shareMessage || 'Copy preview link'}><ShareIcon /><span className="studio-share-label">Share</span></button>}
          {fileName && <button className="studio-action-url" type="button" onClick={() => setUrlOpen(!urlOpen)}><span>Load URL</span></button>}
          {fileName && <button className="studio-action-file" type="button" onClick={() => fileInput.current?.click()}><span>Open file</span></button>}
          <button className="studio-theme" type="button" onClick={cycleTheme} aria-label={`Theme: ${theme}`}>{theme === 'dark' ? '◐' : theme === 'light' ? '○' : '◒'}</button>
          <input ref={fileInput} type="file" accept=".yaml,.yml,.json,application/json,text/yaml" hidden onChange={(event) => void loadFile(event.target.files?.[0])} />
        </div>
      </header>

      {urlOpen && (
        <form className="studio-url" onSubmit={(event) => { event.preventDefault(); void loadUrl(url); }}>
          <label htmlFor="spec-url">OpenAPI document URL</label>
          <input id="spec-url" type="url" placeholder="https://example.com/openapi.yaml" value={url} onChange={(event) => setUrl(event.target.value)} autoFocus />
          <button type="submit" disabled={loading}>{loading ? 'Loading…' : 'Load'}</button>
          <button type="button" onClick={() => setUrlOpen(false)}>Cancel</button>
          {message && <span className="studio-message">{message}</span>}
        </form>
      )}

      {fileName ? (
        <div className="studio-workspace">
          <div className="studio-preview"><Speccy spec={spec} theme={theme} showThemeToggle={false} showDeveloperHints spectralDiagnostics={spectralDiagnostics} route={referenceRoute} onNavigate={navigateRenderer} hrefForRoute={rendererHref} parameterPrototype /></div>
        </div>
      ) : (
        <main className="studio-home">
          <section className="studio-home-intro">
            <span className="studio-eyebrow">API reference studio</span>
            <h1>Pick up where you left off.</h1>
            <p>Open a recent API reference, or bring in an OpenAPI document to start exploring.</p>
            <div className="studio-home-actions">
              <button className="is-primary" type="button" onClick={() => fileInput.current?.click()}>Open a file</button>
              <button type="button" onClick={() => setUrlOpen(true)}>Load from URL</button>
              <button type="button" onClick={openSample}>Explore the sample</button>
            </div>
          </section>
          <section className="studio-recents" aria-labelledby="recent-heading">
            <div className="studio-section-heading">
              <div><span className="studio-eyebrow">Your workspace</span><h2 id="recent-heading">Recent references</h2></div>
              <span>{recents.length} {recents.length === 1 ? 'reference' : 'references'}</span>
            </div>
            {recents.length ? (
              <div className="studio-recent-grid">
                {recents.map((reference) => (
                  <button className="studio-recent-card" type="button" key={reference.id} onClick={() => openRecent(reference)}>
                    <span className="studio-recent-icon"><Mark /></span>
                    <span className="studio-recent-name">{reference.name}</span>
                    <span className="studio-recent-meta">Opened {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(reference.openedAt)}</span>
                    <span className="studio-recent-arrow" aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="studio-empty"><Mark /><h3>No recent references yet</h3><p>References you open will stay handy here on this device.</p></div>
            )}
          </section>
        </main>
      )}
    </div>
  );
}
