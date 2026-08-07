/**
 * ---
 * purpose: Renders contextual API authoring hints and a filterable health drawer with local rule suppressions.
 * related:
 *   - ./diagnostics.ts - Produces the normalized findings shown here.
 *   - ./Speccy.tsx - Places the trigger, drawer, and contextual findings in the reference.
 * ---
 */

import { useMemo, useState } from 'react';
import type { ApiDiagnostic, DiagnosticSeverity } from './diagnostics';
import { useLocalState } from './useLocalState';

const SEVERITY_LABELS: Record<DiagnosticSeverity, string> = { issue: 'Issues', warning: 'Warnings', suggestion: 'Suggestions' };

function diagnosticLocation(diagnostic: ApiDiagnostic) {
  const source = diagnostic.range ? `line ${diagnostic.range.start.line + 1}` : diagnostic.path.join(' › ');
  return source || 'Document';
}

function DiagnosticCard({ diagnostic, onIgnore }: { diagnostic: ApiDiagnostic; onIgnore?: (ruleId: string) => void }) {
  return <article className={`sp-diagnostic-card is-${diagnostic.severity}`}>
    <div className="sp-diagnostic-card-head"><span>{diagnostic.severity}</span><code>{diagnostic.source}: {diagnostic.ruleId}</code></div>
    <strong>{diagnostic.message}</strong>
    {diagnostic.rationale && <p>{diagnostic.rationale}</p>}
    {diagnostic.suggestion && <p className="sp-diagnostic-fix">Try this: {diagnostic.suggestion}</p>}
    <footer><span title={diagnostic.path.join('.')}>{diagnosticLocation(diagnostic)}</span>{onIgnore && <button type="button" onClick={() => onIgnore(diagnostic.ruleId)}>Ignore this rule</button>}</footer>
  </article>;
}

export function InlineDiagnostics({ diagnostics }: { diagnostics: ApiDiagnostic[] }) {
  if (!diagnostics.length) return null;
  return <div className="sp-inline-diagnostics">{diagnostics.slice(0, 3).map((diagnostic) => <DiagnosticCard diagnostic={diagnostic} key={diagnostic.id} />)}{diagnostics.length > 3 && <span className="sp-inline-more">And {diagnostics.length - 3} more in API health</span>}</div>;
}

export function DeveloperDiagnostics({ diagnostics, storageScope }: { diagnostics: ApiDiagnostic[]; storageScope: string }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | DiagnosticSeverity>('all');
  const [query, setQuery] = useState('');
  const [ignoredRules, setIgnoredRules] = useLocalState<string[]>(`${storageScope}:ignored-diagnostic-rules`, []);
  const visible = useMemo(() => diagnostics.filter((diagnostic) => !ignoredRules.includes(diagnostic.ruleId)), [diagnostics, ignoredRules]);
  const filtered = visible.filter((diagnostic) => (filter === 'all' || diagnostic.severity === filter) && (!query.trim() || `${diagnostic.message} ${diagnostic.ruleId} ${diagnostic.path.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())));
  const counts = Object.fromEntries((['issue', 'warning', 'suggestion'] as const).map((severity) => [severity, visible.filter((item) => item.severity === severity).length])) as Record<DiagnosticSeverity, number>;
  const ignore = (ruleId: string) => setIgnoredRules([...new Set([...ignoredRules, ruleId])]);

  return <>
    <button type="button" className={`sp-diagnostics-trigger ${counts.issue ? 'has-issues' : ''}`} onClick={() => setOpen(true)} aria-label={`API health: ${visible.length} finding${visible.length === 1 ? '' : 's'}`}>
      <span aria-hidden="true">!</span><strong>API health</strong><small>{visible.length}</small>
    </button>
    {open && <div className="sp-diagnostics-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside className="sp-diagnostics-drawer" aria-label="API health" aria-modal="true" role="dialog">
        <header><div><span className="sp-eyebrow">Developer view</span><h2>API health</h2><p>Contract checks and design guidance. No opaque score.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close API health">×</button></header>
        <div className="sp-diagnostics-summary">{(['issue', 'warning', 'suggestion'] as const).map((severity) => <button type="button" className={filter === severity ? 'is-active' : ''} onClick={() => setFilter(filter === severity ? 'all' : severity)} key={severity}><strong>{counts[severity]}</strong><span>{SEVERITY_LABELS[severity]}</span></button>)}</div>
        <div className="sp-diagnostics-tools"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a path, rule, or message" aria-label="Filter API health findings" />{ignoredRules.length > 0 && <button type="button" onClick={() => setIgnoredRules([])}>Restore {ignoredRules.length} ignored rule{ignoredRules.length === 1 ? '' : 's'}</button>}</div>
        <div className="sp-diagnostics-list">{filtered.map((diagnostic) => <DiagnosticCard diagnostic={diagnostic} onIgnore={ignore} key={diagnostic.id} />)}{filtered.length === 0 && <div className="sp-diagnostics-empty"><strong>No matching findings</strong><span>Change the filter or restore ignored rules.</span></div>}</div>
      </aside>
    </div>}
  </>;
}
