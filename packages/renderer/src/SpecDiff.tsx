/**
 * ---
 * purpose: Presents a normalized semantic diff between two OpenAPI descriptions.
 * related:
 *   - ./styles.css - Styles the diff summary, filters, groups, and change details.
 *   - ./index.ts - Exposes the component and report contract as public renderer API.
 * ---
 */

import { useMemo, useState } from 'react';
import type { HttpMethod } from './types';

export type DiffSeverity = 'breaking' | 'warning' | 'compatible' | 'documentation';
export type DiffKind = 'added' | 'removed' | 'changed' | 'deprecated';

export interface DiffSpecVersion {
  title?: string;
  version?: string;
  source?: string;
}

export interface DiffSourceLocation {
  source?: string;
  line?: number;
  column?: number;
}

export interface ApiChange {
  id: string;
  severity: DiffSeverity;
  kind: DiffKind;
  method?: HttpMethod;
  path?: string;
  operationId?: string;
  tag?: string;
  location: string[];
  message: string;
  before?: unknown;
  after?: unknown;
  source?: {
    base?: DiffSourceLocation;
    revision?: DiffSourceLocation;
  };
}

export interface DiffReport {
  base: DiffSpecVersion;
  revision: DiffSpecVersion;
  changes: ApiChange[];
}

export interface SpecDiffProps {
  report: DiffReport;
  title?: string;
  className?: string;
  theme?: 'light' | 'dark' | 'system';
  accentColor?: string;
  hrefForChange?: (change: ApiChange) => string | undefined;
}

const SEVERITIES: Array<{ value: DiffSeverity; label: string }> = [
  { value: 'breaking', label: 'Breaking' },
  { value: 'warning', label: 'Warnings' },
  { value: 'compatible', label: 'Compatible' },
  { value: 'documentation', label: 'Documentation' },
];

function formatVersion(spec: DiffSpecVersion, fallback: string) {
  return [spec.title, spec.version].filter(Boolean).join(' ') || spec.source || fallback;
}

function formatValue(value: unknown) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function ChangeValue({ label, value }: { label: string; value: unknown }) {
  if (value === undefined) return null;
  return (
    <div className="sp-diff-value">
      <strong>{label}</strong>
      <pre>{formatValue(value)}</pre>
    </div>
  );
}

function ChangeCard({ change, href }: { change: ApiChange; href?: string }) {
  const body = (
    <>
      <div className="sp-diff-change-heading">
        <span className={`sp-diff-kind sp-diff-kind-${change.kind}`}>{change.kind}</span>
        {change.method && <span className={`sp-method sp-method-${change.method}`}>{change.method}</span>}
        {change.path && <code className="sp-diff-path">{change.path}</code>}
      </div>
      <span className="sp-diff-message">{change.message}</span>
    </>
  );

  return (
    <article className={`sp-diff-change sp-diff-change-${change.severity}`}>
      <details>
        <summary>{href ? <a href={href}>{body}</a> : body}</summary>
        <div className="sp-diff-change-body">
          <code className="sp-diff-location">{change.location.join(' › ')}</code>
          <div className="sp-diff-values">
            <ChangeValue label="Before" value={change.before} />
            <ChangeValue label="After" value={change.after} />
          </div>
        </div>
      </details>
    </article>
  );
}

export function SpecDiff({
  report,
  title = 'API changes',
  className,
  theme = 'system',
  accentColor,
  hrefForChange,
}: SpecDiffProps) {
  const [filter, setFilter] = useState<'all' | DiffSeverity>('all');
  const counts = useMemo(() => Object.fromEntries(SEVERITIES.map(({ value }) => [
    value,
    report.changes.filter((change) => change.severity === value).length,
  ])) as Record<DiffSeverity, number>, [report.changes]);
  const visibleChanges = filter === 'all'
    ? report.changes
    : report.changes.filter((change) => change.severity === filter);
  const groups = useMemo(() => {
    const result = new Map<string, ApiChange[]>();
    for (const change of visibleChanges) {
      const key = change.tag || 'General';
      result.set(key, [...(result.get(key) ?? []), change]);
    }
    return result;
  }, [visibleChanges]);

  return (
    <section
      className={['speccy', `sp-theme-${theme}`, 'sp-diff', className].filter(Boolean).join(' ')}
      style={accentColor ? { '--sp-accent': accentColor } as React.CSSProperties : undefined}
    >
      <header className="sp-diff-hero">
        <div>
          <div className="sp-eyebrow">OpenAPI diff</div>
          <h1>{title}</h1>
          <p>{formatVersion(report.base, 'Base')} <span aria-hidden="true">→</span> {formatVersion(report.revision, 'Revision')}</p>
        </div>
        <div className="sp-diff-summary" aria-label="Change summary">
          {SEVERITIES.map(({ value, label }) => (
            <div key={value} className={`sp-diff-summary-${value}`}>
              <strong>{counts[value]}</strong>
              <span>{label.toLowerCase()}</span>
            </div>
          ))}
        </div>
      </header>

      <nav className="sp-diff-filters" aria-label="Filter changes">
        <button type="button" className={filter === 'all' ? 'is-active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          All {report.changes.length}
        </button>
        {SEVERITIES.map(({ value, label }) => (
          <button key={value} type="button" className={filter === value ? 'is-active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {label} {counts[value]}
          </button>
        ))}
      </nav>

      <div className="sp-diff-groups">
        {groups.size === 0 && <p className="sp-diff-empty">No {filter} changes.</p>}
        {[...groups].map(([group, changes]) => (
          <section className="sp-diff-group" key={group}>
            <h2>{group}</h2>
            <div className="sp-diff-change-list">
              {changes.map((change) => <ChangeCard key={change.id} change={change} href={hrefForChange?.(change)} />)}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
