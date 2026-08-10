/**
 * ---
 * purpose: Renders contextual API authoring hints and a filterable health drawer with local rule suppressions.
 * related:
 *   - ../../core/src/diagnostics.ts - Produces the normalized findings shown here.
 *   - ./Speccy.tsx - Places the trigger, drawer, and contextual findings in the reference.
 * ---
 */

import { useMemo, useState } from 'react';
import type { ApiDiagnostic, DiagnosticSeverity } from 'speccy-core';
import type { SpeccyRoute } from './types';
import { useLocalState } from './useLocalState';

const SEVERITY_LABELS: Record<DiagnosticSeverity, string> = {
  issue: 'Issues',
  warning: 'Warnings',
  suggestion: 'Suggestions',
};

function diagnosticLocation(diagnostic: ApiDiagnostic) {
  const source = diagnostic.range
    ? `line ${diagnostic.range.start.line + 1}`
    : diagnostic.path.join(' › ');
  return source || 'Document';
}

function diagnosticText(diagnostic: ApiDiagnostic) {
  return [
    `## ${diagnostic.severity.toUpperCase()}: ${diagnostic.message}`,
    `Rule: ${diagnostic.source}: ${diagnostic.ruleId}`,
    `Location: ${diagnosticLocation(diagnostic)}`,
    diagnostic.rationale && `Why: ${diagnostic.rationale}`,
    diagnostic.suggestion && `Suggested fix: ${diagnostic.suggestion}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function diagnosticsAsText(diagnostics: ApiDiagnostic[]) {
  const counts = Object.fromEntries(
    (['issue', 'warning', 'suggestion'] as const).map((severity) => [
      severity,
      diagnostics.filter((item) => item.severity === severity).length,
    ]),
  ) as Record<DiagnosticSeverity, number>;
  const countLabel = (severity: DiagnosticSeverity) =>
    `${counts[severity]} ${severity}${counts[severity] === 1 ? '' : 's'}`;
  return [
    '# API health findings',
    `${countLabel('issue')}, ${countLabel('warning')}, ${countLabel('suggestion')}`,
    ...diagnostics.map(diagnosticText),
  ].join('\n\n');
}

function csvCell(value: string | undefined) {
  return `"${(value ?? '').replaceAll('"', '""')}"`;
}

export function diagnosticsAsCsv(diagnostics: ApiDiagnostic[]) {
  const headings = [
    'Severity',
    'Source',
    'Rule',
    'Message',
    'Rationale',
    'Suggested fix',
    'Location',
    'Path',
  ];
  const rows = diagnostics.map((diagnostic) =>
    [
      diagnostic.severity,
      diagnostic.source,
      diagnostic.ruleId,
      diagnostic.message,
      diagnostic.rationale,
      diagnostic.suggestion,
      diagnosticLocation(diagnostic),
      diagnostic.path.join('.'),
    ]
      .map(csvCell)
      .join(','),
  );
  return [headings.map(csvCell).join(','), ...rows].join('\n');
}

function downloadCsv(diagnostics: ApiDiagnostic[]) {
  const url = URL.createObjectURL(
    new Blob([diagnosticsAsCsv(diagnostics)], {
      type: 'text/csv;charset=utf-8',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'api-health-findings.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function DiagnosticCard({
  diagnostic,
  route,
  href,
  onNavigate,
  onIgnore,
}: {
  diagnostic: ApiDiagnostic;
  route?: SpeccyRoute;
  href?: string;
  onNavigate?: (route: SpeccyRoute) => void;
  onIgnore?: (ruleId: string) => void;
}) {
  return (
    <article className={`sp-diagnostic-card is-${diagnostic.severity}`}>
      <div className="sp-diagnostic-card-head">
        <span>{diagnostic.severity}</span>
        <code>
          {diagnostic.source}: {diagnostic.ruleId}
        </code>
      </div>
      <strong>{diagnostic.message}</strong>
      {diagnostic.rationale && <p>{diagnostic.rationale}</p>}
      {diagnostic.suggestion && (
        <p className="sp-diagnostic-fix">Try this: {diagnostic.suggestion}</p>
      )}
      <footer>
        <span title={diagnostic.path.join('.')}>
          {diagnosticLocation(diagnostic)}
        </span>
        <span className="sp-diagnostic-actions">
          {route && href && (
            <a
              href={href}
              onClick={(event) => {
                event.preventDefault();
                onNavigate?.(route);
              }}
            >
              View page
            </a>
          )}
          {onIgnore && (
            <button type="button" onClick={() => onIgnore(diagnostic.ruleId)}>
              Ignore this rule
            </button>
          )}
        </span>
      </footer>
    </article>
  );
}

type DiagnosticNavigationProps = {
  routeForDiagnostic?: (diagnostic: ApiDiagnostic) => SpeccyRoute;
  hrefForRoute?: (route: SpeccyRoute) => string;
  onNavigate?: (route: SpeccyRoute) => void;
};

export function InlineDiagnostics({
  diagnostics,
  onViewAll,
  routeForDiagnostic,
  hrefForRoute,
  onNavigate,
}: {
  diagnostics: ApiDiagnostic[];
  onViewAll: () => void;
} & DiagnosticNavigationProps) {
  const [expanded, setExpanded] = useState(true);
  if (!diagnostics.length) return null;
  return (
    <div className={`sp-inline-diagnostics ${expanded ? '' : 'is-collapsed'}`}>
      <div className="sp-inline-controls">
        <span>
          {diagnostics.length} hint{diagnostics.length === 1 ? '' : 's'}
        </span>
        <button type="button" onClick={onViewAll}>
          View all
        </button>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {expanded && (
        <>
          {diagnostics.slice(0, 3).map((diagnostic) => {
            const route = routeForDiagnostic?.(diagnostic);
            return (
              <DiagnosticCard
                diagnostic={diagnostic}
                route={route}
                href={route && hrefForRoute?.(route)}
                onNavigate={onNavigate}
                key={diagnostic.id}
              />
            );
          })}
          {diagnostics.length > 3 && (
            <span className="sp-inline-more">
              And {diagnostics.length - 3} more
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function DeveloperDiagnostics({
  diagnostics,
  currentPageDiagnostics,
  open,
  onOpenChange,
  scope,
  onScopeChange,
  storageScope,
  routeForDiagnostic,
  hrefForRoute,
  onNavigate,
}: {
  diagnostics: ApiDiagnostic[];
  currentPageDiagnostics?: ApiDiagnostic[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: 'page' | 'all';
  onScopeChange: (scope: 'page' | 'all') => void;
  storageScope: string;
} & DiagnosticNavigationProps) {
  const [filter, setFilter] = useState<'all' | DiagnosticSeverity>('all');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [ignoredRules, setIgnoredRules] = useLocalState<string[]>(
    `${storageScope}:ignored-diagnostic-rules`,
    [],
  );
  const allVisible = useMemo(
    () =>
      diagnostics.filter(
        (diagnostic) => !ignoredRules.includes(diagnostic.ruleId),
      ),
    [diagnostics, ignoredRules],
  );
  const pageVisible = useMemo(
    () =>
      currentPageDiagnostics?.filter(
        (diagnostic) => !ignoredRules.includes(diagnostic.ruleId),
      ),
    [currentPageDiagnostics, ignoredRules],
  );
  const visible = scope === 'page' && pageVisible ? pageVisible : allVisible;
  const filtered = visible.filter(
    (diagnostic) =>
      (filter === 'all' || diagnostic.severity === filter) &&
      (!query.trim() ||
        `${diagnostic.message} ${diagnostic.ruleId} ${diagnostic.path.join(' ')}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())),
  );
  const counts = Object.fromEntries(
    (['issue', 'warning', 'suggestion'] as const).map((severity) => [
      severity,
      visible.filter((item) => item.severity === severity).length,
    ]),
  ) as Record<DiagnosticSeverity, number>;
  const ignore = (ruleId: string) =>
    setIgnoredRules([...new Set([...ignoredRules, ruleId])]);

  async function copyAll() {
    await navigator.clipboard?.writeText(diagnosticsAsText(visible));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <>
      <button
        type="button"
        className={`sp-diagnostics-trigger ${allVisible.some((diagnostic) => diagnostic.severity === 'issue') ? 'has-issues' : ''}`}
        onClick={() => {
          onScopeChange(currentPageDiagnostics ? 'page' : 'all');
          onOpenChange(true);
        }}
        aria-label={`API health: ${allVisible.length} finding${allVisible.length === 1 ? '' : 's'}`}
      >
        <span aria-hidden="true">!</span>
        <strong>API health</strong>
        <small>{allVisible.length}</small>
      </button>
      {open && (
        <div
          className="sp-diagnostics-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onOpenChange(false);
          }}
        >
          <aside
            className={`sp-diagnostics-drawer ${pageVisible ? 'has-tabs' : ''}`}
            aria-label="API health"
            aria-modal="true"
            role="dialog"
          >
            <header>
              <div>
                <span className="sp-eyebrow">Developer view</span>
                <h2>API health</h2>
                <p>Contract checks and design guidance. No opaque score.</p>
              </div>
              <div className="sp-diagnostics-header-actions">
                <details className="sp-diagnostics-menu">
                  <summary aria-label="API health actions">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="5" cy="12" r="1.75" />
                      <circle cx="12" cy="12" r="1.75" />
                      <circle cx="19" cy="12" r="1.75" />
                    </svg>
                  </summary>
                  <div>
                    <button
                      type="button"
                      onClick={copyAll}
                      disabled={visible.length === 0}
                    >
                      {copied ? 'Copied' : 'Copy all'}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCsv(visible)}
                      disabled={visible.length === 0}
                    >
                      Export CSV
                    </button>
                    {ignoredRules.length > 0 && (
                      <button type="button" onClick={() => setIgnoredRules([])}>
                        Restore {ignoredRules.length} ignored rule
                        {ignoredRules.length === 1 ? '' : 's'}
                      </button>
                    )}
                  </div>
                </details>
                <button
                  type="button"
                  className="sp-diagnostics-close"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close API health"
                >
                  ×
                </button>
              </div>
            </header>
            {pageVisible && (
              <div className="sp-diagnostics-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === 'page'}
                  className={scope === 'page' ? 'is-active' : ''}
                  onClick={() => onScopeChange('page')}
                >
                  This endpoint <span>{pageVisible.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === 'all'}
                  className={scope === 'all' ? 'is-active' : ''}
                  onClick={() => onScopeChange('all')}
                >
                  All API <span>{allVisible.length}</span>
                </button>
              </div>
            )}
            <div className="sp-diagnostics-summary">
              {(['issue', 'warning', 'suggestion'] as const).map((severity) => (
                <button
                  type="button"
                  className={filter === severity ? 'is-active' : ''}
                  onClick={() =>
                    setFilter(filter === severity ? 'all' : severity)
                  }
                  key={severity}
                >
                  <strong>{counts[severity]}</strong>
                  <span>{SEVERITY_LABELS[severity]}</span>
                </button>
              ))}
            </div>
            <div className="sp-diagnostics-tools">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a path, rule, or message"
                aria-label="Filter API health findings"
              />
            </div>
            <div className="sp-diagnostics-list">
              {filtered.map((diagnostic) => {
                const diagnosticRoute = routeForDiagnostic?.(diagnostic);
                return (
                  <DiagnosticCard
                    diagnostic={diagnostic}
                    route={diagnosticRoute}
                    href={diagnosticRoute && hrefForRoute?.(diagnosticRoute)}
                    onNavigate={(route) => {
                      onOpenChange(false);
                      onNavigate?.(route);
                    }}
                    onIgnore={ignore}
                    key={diagnostic.id}
                  />
                );
              })}
              {filtered.length === 0 && (
                <div className="sp-diagnostics-empty">
                  <strong>No matching findings</strong>
                  <span>Change the filter or restore ignored rules.</span>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
