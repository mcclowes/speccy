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

export interface ApiChange {
  id: string;
  severity: DiffSeverity;
  kind: DiffKind;
  method?: HttpMethod;
  path?: string;
  operationId?: string;
  tag?: string;
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

const OPERATION_AREAS: Array<{ value: Exclude<DiffArea, 'operation' | 'documentation'>; label: string }> = [
  { value: 'parameters', label: 'Parameters' },
  { value: 'request-body', label: 'Request body' },
  { value: 'response-body', label: 'Response body' },
  { value: 'headers', label: 'Headers' },
  { value: 'security', label: 'Security' },
];

function formatVersion(spec: DiffSpecVersion, fallback: string) {
  return [spec.title, spec.version].filter(Boolean).join(' ') || spec.source || fallback;
}

function formatValue(value: unknown) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
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
    } else if (lengths[left + 1]![right]! >= lengths[left]![right + 1]!) {
      left += 1;
    } else {
      right += 1;
    }
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
  return (
    <div className={['sp-diff-line', line?.changed && `is-${side}`, !line && 'is-empty'].filter(Boolean).join(' ')}>
      <span className="sp-diff-line-number">{line?.number}</span>
      <span className="sp-diff-line-marker" aria-hidden="true">{line?.changed ? (side === 'before' ? '−' : '+') : ' '}</span>
      <code>{line?.text ?? ' '}</code>
    </div>
  );
}

function ChangeValues({ before, after }: Pick<ApiChange, 'before' | 'after'>) {
  if (before === undefined && after === undefined) return null;
  const rows = createSideBySideDiff(before, after);
  return (
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
  );
}

function inferredArea(change: ApiChange): DiffArea {
  if (change.scope) return change.scope.area;
  if (change.severity === 'documentation') return 'documentation';
  if (change.location.includes('requestBody')) return 'request-body';
  if (change.location.includes('responses')) return change.location.includes('headers') ? 'headers' : 'response-body';
  if (change.location.includes('parameters')) return 'parameters';
  if (change.location.includes('security')) return 'security';
  return 'operation';
}

function areaLabel(area: DiffArea) {
  return OPERATION_AREAS.find(({ value }) => value === area)?.label
    ?? (area === 'operation' ? 'Entire operation' : 'Documentation');
}

function ChangeDetails({ change, href }: { change: ApiChange; href?: string }) {
  const area = inferredArea(change);
  const body = (
    <>
      <div className="sp-diff-change-heading">
        <span className={`sp-diff-kind sp-diff-kind-${change.kind}`}>{change.kind}</span>
        <span className="sp-diff-area">{areaLabel(area)}</span>
        {change.scope?.label && <span className="sp-diff-scope-detail">{change.scope.label}</span>}
      </div>
      <span className="sp-diff-message">{change.message}</span>
    </>
  );

  return (
    <div className={`sp-diff-change-detail sp-diff-change-${change.severity}`}>
      <details>
        <summary>{href ? <a href={href}>{body}</a> : body}</summary>
        <div className="sp-diff-change-body">
          <code className="sp-diff-location">{change.location.join(' › ')}</code>
          <ChangeValues before={change.before} after={change.after} />
        </div>
      </details>
    </div>
  );
}

function OperationChanges({ changes, hrefForChange }: { changes: ApiChange[]; hrefForChange?: SpecDiffProps['hrefForChange'] }) {
  const first = changes[0]!;
  const isOperation = Boolean(first.method && first.path);
  const wholeOperation = changes.some((change) => inferredArea(change) === 'operation');
  const severities = new Set(changes.map((change) => change.severity));
  const severity = (['breaking', 'warning', 'compatible', 'documentation'] as DiffSeverity[]).find((value) => severities.has(value))!;

  return (
    <article className={`sp-diff-operation sp-diff-operation-${severity}`}>
      <header className="sp-diff-operation-heading">
        <div>
          {first.method && <span className={`sp-method sp-method-${first.method}`}>{first.method}</span>}
          {first.path && <code className="sp-diff-path">{first.path}</code>}
        </div>
        <span>{changes.length} {changes.length === 1 ? 'change' : 'changes'} reported</span>
      </header>
      {isOperation && !wholeOperation && (
        <div className="sp-diff-impact" aria-label="Operation impact">
          {OPERATION_AREAS.map(({ value, label }) => {
            const affected = changes.filter((change) => inferredArea(change) === value);
            return (
              <div className={affected.length ? 'is-affected' : 'is-unchanged'} key={value}>
                <span>{label}</span>
                <strong>{affected.length ? `${affected.length} changed` : 'Unchanged'}</strong>
              </div>
            );
          })}
        </div>
      )}
      {isOperation && wholeOperation && <div className="sp-diff-whole-operation">The entire operation was {first.kind}.</div>}
      <div className="sp-diff-change-list">
        {changes.map((change) => <ChangeDetails key={change.id} change={change} href={hrefForChange?.(change)} />)}
      </div>
      {isOperation && !wholeOperation && <p className="sp-diff-operation-note">No other changes were reported for this operation.</p>}
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
        {[...groups].map(([group, operations]) => (
          <section className="sp-diff-group" key={group}>
            <h2>{group}</h2>
            <div className="sp-diff-operation-list">
              {[...operations].map(([operation, changes]) => (
                <OperationChanges key={operation} changes={changes} hrefForChange={hrefForChange} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
