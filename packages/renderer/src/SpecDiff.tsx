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
export type DiffArea = 'operation' | 'parameters' | 'request-body' | 'response-body' | 'headers' | 'security' | 'documentation';

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

export interface DiffOperation {
  method: HttpMethod;
  path: string;
  operationId?: string;
  tag?: string;
}

export interface ApiChange {
  id: string;
  severity: DiffSeverity;
  kind: DiffKind;
  method?: HttpMethod;
  path?: string;
  operationId?: string;
  tag?: string;
  /** Operations affected by a shared component change. The change is counted once. */
  affectedOperations?: DiffOperation[];
  scope?: {
    area: DiffArea;
    /** Human-readable detail such as "200 · application/json · Loan.status". */
    label?: string;
  };
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
  /** Heading level for the component title. Group headings use the following level. */
  headingLevel?: 1 | 2 | 3 | 4 | 5;
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
const SEVERITY_ORDER = new Map(SEVERITIES.map(({ value }, index) => [value, index]));
const KINDS: DiffKind[] = ['added', 'removed', 'changed', 'deprecated'];
const AREAS: DiffArea[] = ['operation', 'parameters', 'request-body', 'response-body', 'headers', 'security', 'documentation'];
const OPERATION_AREAS: Array<{ value: Exclude<DiffArea, 'operation'>; label: string }> = [
  { value: 'parameters', label: 'Parameters' },
  { value: 'request-body', label: 'Request body' },
  { value: 'response-body', label: 'Response body' },
  { value: 'headers', label: 'Headers' },
  { value: 'security', label: 'Security' },
  { value: 'documentation', label: 'Documentation' },
];

function formatVersion(spec: DiffSpecVersion, fallback: string) {
  return [spec.title, spec.version].filter(Boolean).join(' ') || spec.source || fallback;
}

function formatValue(value: unknown) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

interface DiffRow {
  before?: { number: number; text: string; changed: boolean };
  after?: { number: number; text: string; changed: boolean };
}

/** Aligns changed line ranges around their longest common subsequence. */
export function createSideBySideDiff(before: unknown, after: unknown): DiffRow[] {
  const beforeLines = before === undefined ? [] : formatValue(before).split('\n');
  const afterLines = after === undefined ? [] : formatValue(after).split('\n');
  const lengths = Array.from({ length: beforeLines.length + 1 }, () => Array(afterLines.length + 1).fill(0) as number[]);

  for (let left = beforeLines.length - 1; left >= 0; left -= 1) {
    for (let right = afterLines.length - 1; right >= 0; right -= 1) {
      lengths[left]![right] = beforeLines[left] === afterLines[right]
        ? lengths[left + 1]![right + 1]! + 1
        : Math.max(lengths[left + 1]![right]!, lengths[left]![right + 1]!);
    }
  }

  const matches: Array<[number, number]> = [];
  let left = 0;
  let right = 0;
  while (left < beforeLines.length && right < afterLines.length) {
    if (beforeLines[left] === afterLines[right]) {
      matches.push([left, right]);
      left += 1;
      right += 1;
    } else if (lengths[left + 1]![right]! >= lengths[left]![right + 1]!) left += 1;
    else right += 1;
  }

  const rows: DiffRow[] = [];
  let beforeStart = 0;
  let afterStart = 0;
  for (const [beforeMatch, afterMatch] of [...matches, [beforeLines.length, afterLines.length] as [number, number]]) {
    const changedCount = Math.max(beforeMatch - beforeStart, afterMatch - afterStart);
    for (let offset = 0; offset < changedCount; offset += 1) {
      const beforeIndex = beforeStart + offset;
      const afterIndex = afterStart + offset;
      rows.push({
        before: beforeIndex < beforeMatch ? { number: beforeIndex + 1, text: beforeLines[beforeIndex]!, changed: true } : undefined,
        after: afterIndex < afterMatch ? { number: afterIndex + 1, text: afterLines[afterIndex]!, changed: true } : undefined,
      });
    }
    if (beforeMatch < beforeLines.length && afterMatch < afterLines.length) {
      rows.push({
        before: { number: beforeMatch + 1, text: beforeLines[beforeMatch]!, changed: false },
        after: { number: afterMatch + 1, text: afterLines[afterMatch]!, changed: false },
      });
    }
    beforeStart = beforeMatch + 1;
    afterStart = afterMatch + 1;
  }
  return rows;
}

function DiffLine({ side, line }: { side: 'before' | 'after'; line?: NonNullable<DiffRow['before']> }) {
  const changeLabel = line?.changed ? (side === 'before' ? 'Removed line' : 'Added line') : undefined;
  return (
    <div className={['sp-diff-line', line?.changed && `is-${side}`, !line && 'is-empty'].filter(Boolean).join(' ')}>
      <span className="sp-diff-line-number">{line?.number}</span>
      <span className="sp-diff-line-marker" aria-hidden="true">{line?.changed ? (side === 'before' ? '−' : '+') : ' '}</span>
      {changeLabel && <span className="sp-visually-hidden">{changeLabel}: </span>}
      <code>{line?.text ?? ' '}</code>
    </div>
  );
}

function ChangeValues({ before, after }: Pick<ApiChange, 'before' | 'after'>) {
  const rows = useMemo(() => createSideBySideDiff(before, after), [before, after]);
  if (before === undefined && after === undefined) return null;
  return (
    <div className="sp-diff-values-scroll">
      <div className="sp-diff-values">
        <div className="sp-diff-value-heading">Before</div>
        <div className="sp-diff-value-heading">After</div>
        <div className="sp-diff-code" aria-label="Before value">
          {rows.map((row, index) => <DiffLine key={index} side="before" line={row.before} />)}
        </div>
        <div className="sp-diff-code" aria-label="After value">
          {rows.map((row, index) => <DiffLine key={index} side="after" line={row.after} />)}
        </div>
      </div>
    </div>
  );
}

function inferredArea(change: ApiChange): DiffArea {
  if (change.scope) return change.scope.area;
  if (change.severity === 'documentation') return 'documentation';
  const [root, , method, member] = change.location;
  if (root === 'paths' && method && member === 'requestBody') return 'request-body';
  if (root === 'paths' && method && member === 'responses') return change.location[5] === 'headers' ? 'headers' : 'response-body';
  if (root === 'paths' && method && member === 'parameters') return 'parameters';
  if (root === 'paths' && method && member === 'security') return 'security';
  return 'operation';
}

function areaLabel(area: DiffArea) {
  return OPERATION_AREAS.find(({ value }) => value === area)?.label
    ?? (area === 'operation' ? 'Operation' : 'Documentation');
}

function sourceLabel(location: DiffSourceLocation) {
  const position = [location.line, location.column].filter((value) => value !== undefined).join(':');
  return [location.source, position].filter(Boolean).join(':');
}

function assertDiffReport(report: DiffReport): void {
  if (!report || typeof report !== 'object' || !Array.isArray(report.changes)) throw new TypeError('SpecDiff report.changes must be an array.');
  const ids = new Set<string>();
  report.changes.forEach((change, index) => {
    const prefix = `SpecDiff change at index ${index}`;
    if (!change || typeof change !== 'object') throw new TypeError(`${prefix} must be an object.`);
    if (!change.id || ids.has(change.id)) throw new TypeError(`${prefix} must have a unique, non-empty id.`);
    ids.add(change.id);
    if (!SEVERITY_ORDER.has(change.severity)) throw new TypeError(`${prefix} has unknown severity "${String(change.severity)}".`);
    if (!KINDS.includes(change.kind)) throw new TypeError(`${prefix} has unknown kind "${String(change.kind)}".`);
    if (!Array.isArray(change.location) || !change.location.every((part) => typeof part === 'string')) throw new TypeError(`${prefix}.location must be an array of strings.`);
    if (typeof change.message !== 'string') throw new TypeError(`${prefix}.message must be a string.`);
    if (change.scope && !AREAS.includes(change.scope.area)) throw new TypeError(`${prefix} has unknown scope area "${String(change.scope.area)}".`);
  });
}

function ChangeDetails({ change, href, expanded, onExpandedChange }: {
  change: ApiChange;
  href?: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const area = inferredArea(change);
  const sources = [change.source?.base && ['Base', change.source.base] as const, change.source?.revision && ['Revision', change.source.revision] as const].filter(Boolean) as Array<readonly [string, DiffSourceLocation]>;
  return (
    <div id={change.id} className={`sp-diff-change-detail sp-diff-change-${change.severity}`}>
      <details open={expanded}>
        <summary onClick={(event) => { event.preventDefault(); onExpandedChange(!expanded); }}>
          <span className="sp-diff-change-heading">
            <span className={`sp-diff-severity sp-diff-severity-${change.severity}`}>{change.severity}</span>
            <span className={`sp-diff-kind sp-diff-kind-${change.kind}`}>{change.kind}</span>
            <span className="sp-diff-area">{areaLabel(area)}</span>
            {change.scope?.label && <span className="sp-diff-scope-detail">{change.scope.label}</span>}
          </span>
          <span className="sp-diff-message">{change.message}</span>
        </summary>
        <div className="sp-diff-change-body">
          <div className="sp-diff-change-meta">
            <code className="sp-diff-location">{change.location.join(' › ')}</code>
            {href && <a className="sp-diff-change-link" href={href}>View operation</a>}
          </div>
          {sources.length > 0 && <div className="sp-diff-sources">{sources.map(([label, location]) => <span key={label}>{label}: <code>{sourceLabel(location)}</code></span>)}</div>}
          {change.affectedOperations && change.affectedOperations.length > 0 && (
            <div className="sp-diff-affected-operations">
              <strong>Affects {change.affectedOperations.length} {change.affectedOperations.length === 1 ? 'operation' : 'operations'}</strong>
              <ul>{change.affectedOperations.map((operation) => <li key={`${operation.method}:${operation.path}`}><span className={`sp-method sp-method-${operation.method}`}>{operation.method}</span> <code>{operation.path}</code></li>)}</ul>
            </div>
          )}
          {expanded && <ChangeValues before={change.before} after={change.after} />}
        </div>
      </details>
    </div>
  );
}

function OperationChanges({ changes, hrefForChange, expandedIds, onExpandedChange }: {
  changes: ApiChange[];
  hrefForChange?: SpecDiffProps['hrefForChange'];
  expandedIds: Set<string>;
  onExpandedChange: (id: string, expanded: boolean) => void;
}) {
  const first = changes[0]!;
  const isOperation = Boolean(first.method && first.path);
  const wholeOperation = changes.find((change) => inferredArea(change) === 'operation' && (change.kind === 'added' || change.kind === 'removed'));
  const severity = changes.reduce((worst, change) => SEVERITY_ORDER.get(change.severity)! < SEVERITY_ORDER.get(worst)! ? change.severity : worst, changes[0]!.severity);

  return (
    <article className={`sp-diff-operation sp-diff-operation-${severity}`}>
      <header className="sp-diff-operation-heading">
        <div>
          {first.method && <span className={`sp-method sp-method-${first.method}`}>{first.method}</span>}
          {first.path && <code className="sp-diff-path">{first.path}</code>}
        </div>
        <span>{changes.length} {changes.length === 1 ? 'change' : 'changes'}</span>
      </header>
      {isOperation && !wholeOperation && (
        <div className="sp-diff-impact" aria-label="Operation impact">
          {OPERATION_AREAS.map(({ value, label }) => {
            const affected = changes.filter((change) => inferredArea(change) === value);
            return <div className={affected.length ? 'is-affected' : 'is-unchanged'} key={value}><span>{label}</span><strong>{affected.length ? `${affected.length} changed` : 'Unchanged'}</strong></div>;
          })}
        </div>
      )}
      {wholeOperation && <div className="sp-diff-whole-operation">The entire operation was {wholeOperation.kind}.</div>}
      <div className="sp-diff-change-list">
        {changes.map((change) => <ChangeDetails key={change.id} change={change} href={hrefForChange?.(change)} expanded={expandedIds.has(change.id)} onExpandedChange={(expanded) => onExpandedChange(change.id, expanded)} />)}
      </div>
    </article>
  );
}

export function SpecDiff({ report, title = 'API changes', headingLevel = 2, className, theme = 'system', accentColor, hrefForChange }: SpecDiffProps) {
  assertDiffReport(report);
  const [filter, setFilter] = useState<'all' | DiffSeverity>('all');
  const [areaFilter, setAreaFilter] = useState<'all' | DiffArea>('all');
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState(() => new Set<string>());
  const Title = `h${headingLevel}` as 'h1';
  const GroupHeading = `h${Math.min(headingLevel + 1, 6)}` as 'h2';
  const counts = useMemo(() => Object.fromEntries(SEVERITIES.map(({ value }) => [value, report.changes.filter((change) => change.severity === value).length])) as Record<DiffSeverity, number>, [report.changes]);
  const visibleChanges = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return report.changes
      .filter((change) => filter === 'all' || change.severity === filter)
      .filter((change) => areaFilter === 'all' || inferredArea(change) === areaFilter)
      .filter((change) => !needle || [change.message, change.path, change.method, change.operationId, change.tag, change.scope?.label, ...change.location].some((value) => value?.toLocaleLowerCase().includes(needle)))
      .sort((a, b) => SEVERITY_ORDER.get(a.severity)! - SEVERITY_ORDER.get(b.severity)! || (a.path ?? '').localeCompare(b.path ?? '') || a.id.localeCompare(b.id));
  }, [areaFilter, filter, query, report.changes]);
  const groups = useMemo(() => {
    const result = new Map<string, Map<string, ApiChange[]>>();
    for (const change of visibleChanges) {
      const tag = change.tag || 'General';
      const operation = change.method && change.path ? `${change.method}:${change.path}` : `change:${change.id}`;
      const operations = result.get(tag) ?? new Map<string, ApiChange[]>();
      operations.set(operation, [...(operations.get(operation) ?? []), change]);
      result.set(tag, operations);
    }
    return result;
  }, [visibleChanges]);
  const setExpanded = (id: string, expanded: boolean) => setExpandedIds((current) => {
    const next = new Set(current);
    if (expanded) next.add(id); else next.delete(id);
    return next;
  });

  return (
    <section className={['speccy', `sp-theme-${theme}`, 'sp-diff', className].filter(Boolean).join(' ')} style={accentColor ? { '--sp-accent': accentColor } as React.CSSProperties : undefined}>
      <header className="sp-diff-hero">
        <div><div className="sp-eyebrow">OpenAPI diff</div><Title>{title}</Title><p>{formatVersion(report.base, 'Base')} <span aria-hidden="true">→</span> {formatVersion(report.revision, 'Revision')}</p></div>
        <div className="sp-diff-summary" aria-label="Change summary">
          {SEVERITIES.map(({ value, label }) => <div key={value} className={`sp-diff-summary-${value}`}><strong>{counts[value]}</strong><span>{label.toLowerCase()}</span></div>)}
        </div>
      </header>

      <div className="sp-diff-toolbar">
        <nav className="sp-diff-filters" aria-label="Filter changes">
          <button type="button" className={filter === 'all' ? 'is-active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All {report.changes.length}</button>
          {SEVERITIES.map(({ value, label }) => <button key={value} type="button" className={filter === value ? 'is-active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} {counts[value]}</button>)}
        </nav>
        <div className="sp-diff-tools">
          <label><span className="sp-visually-hidden">Filter by area</span><select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value as typeof areaFilter)}><option value="all">All areas</option>{AREAS.map((area) => <option key={area} value={area}>{areaLabel(area)}</option>)}</select></label>
          <label className="sp-diff-search"><span className="sp-visually-hidden">Search changes</span><input type="search" placeholder="Search changes" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <button type="button" onClick={() => setExpandedIds(new Set(visibleChanges.map(({ id }) => id)))}>Expand all</button>
          <button type="button" onClick={() => setExpandedIds(new Set())}>Collapse all</button>
        </div>
      </div>

      <div className="sp-diff-groups">
        {groups.size === 0 && <p className="sp-diff-empty">No matching changes.</p>}
        {[...groups].map(([group, operations]) => (
          <section className="sp-diff-group" key={group}>
            <GroupHeading>{group}</GroupHeading>
            <div className="sp-diff-operation-list">{[...operations].map(([operation, changes]) => <OperationChanges key={operation} changes={changes} hrefForChange={hrefForChange} expandedIds={expandedIds} onExpandedChange={setExpanded} />)}</div>
          </section>
        ))}
      </div>
    </section>
  );
}
