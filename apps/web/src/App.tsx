/**
 * ---
 * purpose: Provides the standalone spec studio with file, URL, paste, theme, and preview controls.
 * related:
 *   - ./sample.ts - Default document used for the first-run preview.
 *   - ./studio.css - Studio chrome and source drawer styling.
 *   - ../../../packages/renderer/src/Speccy.tsx - Shared reference view embedded by the studio.
 * ---
 */

import { useEffect, useRef, useState } from 'react';
import type { OpenAPIDocument } from '@speccy/renderer';
import { Speccy } from '../../../packages/renderer/src/Speccy';
import { SAMPLE_SPEC } from './sample';

declare global {
  interface Window {
    speccyLoadSpec?: (source: string, name?: string) => void;
  }
}

type Theme = 'light' | 'dark' | 'system';

type RecentReference = {
  id: string;
  name: string;
  source: string;
  openedAt: number;
};

const THEME_STORAGE_KEY = 'speccy-theme';
const URL_STORAGE_KEY = 'speccy-oas-url';
const RECENTS_STORAGE_KEY = 'speccy-recent-references';
const MAX_RECENTS = 6;

function storedTheme(): Theme {
  const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system';
}

function storedRecents(): RecentReference[] {
  try {
    const references = JSON.parse(window.localStorage.getItem(RECENTS_STORAGE_KEY) ?? '[]');
    return Array.isArray(references) ? references.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function referenceId(name: string) {
  return `${name}-${Date.now()}`;
}

function Mark() {
  return <span className="studio-mark" aria-hidden="true"><i /><i /><i /></span>;
}

function SourceEditor({ initialSource, onApply }: {
  initialSource: string;
  onApply: (source: string) => void;
}) {
  const [draft, setDraft] = useState(initialSource);

  return (
    <aside className="studio-editor">
      <div className="studio-editor-head"><span>OpenAPI source</span><button type="button" onClick={() => onApply(draft)}>Render changes</button></div>
      <textarea spellCheck={false} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') onApply(draft); }} />
      <div className="studio-editor-foot"><span>YAML or JSON</span><span>⌘ Enter to render</span></div>
    </aside>
  );
}

export function App() {
  const [spec, setSpec] = useState<OpenAPIDocument | string>(SAMPLE_SPEC);
  const [source, setSource] = useState(JSON.stringify(SAMPLE_SPEC, null, 2));
  const [fileName, setFileName] = useState('');
  const [activeId, setActiveId] = useState('');
  const [recents, setRecents] = useState<RecentReference[]>(storedRecents);
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState(() => window.localStorage.getItem(URL_STORAGE_KEY) ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initialUrl = new URLSearchParams(window.location.search).get('url') ?? url;
    if (initialUrl) {
      setUrl(initialUrl);
      void loadUrl(initialUrl);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.speccyLoadSpec = (nextSource, name) => applySource(nextSource, name ?? 'Opened spec');
    return () => { delete window.speccyLoadSpec; };
  }, []);

  function applySource(next: string, name = 'Pasted spec', existingId?: string) {
    const id = existingId ?? referenceId(name);
    setSource(next);
    setSpec(next);
    setFileName(name);
    setActiveId(id);
    setMessage('');
    setRecents((current) => {
      const updated = [{ id, name, source: next, openedAt: Date.now() }, ...current.filter((item) => item.id !== id)].slice(0, MAX_RECENTS);
      window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  function openRecent(reference: RecentReference) {
    applySource(reference.source, reference.name, reference.id);
  }

  function openSample() {
    applySource(JSON.stringify(SAMPLE_SPEC, null, 2), 'Luma Library API');
  }

  function goHome() {
    setFileName('');
    setActiveId('');
    setDrawerOpen(false);
    setUrlOpen(false);
  }

  async function loadFile(file?: File) {
    if (!file) return;
    applySource(await file.text(), file.name);
  }

  async function loadUrl(nextUrl: string) {
    if (!nextUrl.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(nextUrl);
      if (!response.ok) throw new Error(`The server returned ${response.status}.`);
      applySource(await response.text(), new URL(nextUrl).pathname.split('/').pop() || nextUrl);
      setUrl(nextUrl);
      window.localStorage.setItem(URL_STORAGE_KEY, nextUrl);
      setUrlOpen(false);
      const location = new URL(window.location.href);
      location.searchParams.set('url', nextUrl);
      window.history.replaceState({}, '', location);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Couldn’t load that URL.');
    } finally {
      setLoading(false);
    }
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
              {recents.map((reference) => <option key={reference.id} value={reference.id}>{reference.name}</option>)}
            </select>
            <span className="studio-chevron" aria-hidden="true">⌄</span>
          </label>
        ) : <div className="studio-document">Your API references</div>}
        <div className="studio-actions">
          {fileName && <button type="button" onClick={() => setUrlOpen(!urlOpen)}>Load URL</button>}
          {fileName && <button type="button" onClick={() => fileInput.current?.click()}>Open file</button>}
          {fileName && <button type="button" onClick={() => setDrawerOpen(!drawerOpen)}>{drawerOpen ? 'Close source' : 'Edit source'}</button>}
          <button className="studio-theme" type="button" onClick={() => setTheme(theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system')} aria-label={`Theme: ${theme}`}>{theme === 'dark' ? '◐' : theme === 'light' ? '○' : '◒'}</button>
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
        <div className={`studio-workspace ${drawerOpen ? 'is-editing' : ''}`}>
          {drawerOpen && (
            <SourceEditor key={source} initialSource={source} onApply={(draft) => applySource(draft, fileName, activeId)} />
          )}
          <div className="studio-preview"><Speccy spec={spec} theme={theme} logo={<Mark />} basePath="" parameterPrototype /></div>
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
