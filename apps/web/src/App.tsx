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

const THEME_STORAGE_KEY = 'speccy-theme';
const URL_STORAGE_KEY = 'speccy-oas-url';

function storedTheme(): Theme {
  const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return theme === 'light' || theme === 'dark' || theme === 'system' ? theme : 'system';
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
  const [fileName, setFileName] = useState('Luma sample');
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

  function applySource(next: string, name = 'Pasted spec') {
    setSource(next);
    setSpec(next);
    setFileName(name);
    setMessage('');
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
        <a className="studio-logo" href="./"><Mark /><span>Speccy</span></a>
        <div className="studio-document"><span className="studio-dot" />{fileName}</div>
        <div className="studio-actions">
          <button type="button" onClick={() => setUrlOpen(!urlOpen)}>Load URL</button>
          <button type="button" onClick={() => fileInput.current?.click()}>Open file</button>
          <button type="button" onClick={() => setDrawerOpen(!drawerOpen)}>{drawerOpen ? 'Close source' : 'Edit source'}</button>
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

      <div className={`studio-workspace ${drawerOpen ? 'is-editing' : ''}`}>
        {drawerOpen && (
          <SourceEditor key={source} initialSource={source} onApply={(draft) => applySource(draft, fileName)} />
        )}
        <div className="studio-preview"><Speccy spec={spec} theme={theme} logo={<Mark />} basePath="" /></div>
      </div>
    </div>
  );
}
