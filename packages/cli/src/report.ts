/**
 * ---
 * purpose: Turns diff reports and diagnostics into terminal, JSON, and pull request output.
 * related:
 *   - ./cli.ts - Chooses a format and an exit threshold from the command line.
 * ---
 */

import type { ApiChange, ApiDiagnostic, DiagnosticSeverity, DiffReport, DiffSeverity, DiffSpecVersion } from 'speccy-core';

export type Format = 'pretty' | 'json' | 'markdown';
export type DiffThreshold = DiffSeverity | 'never';
export type LintThreshold = DiagnosticSeverity | 'never';

/** Lets the action find and edit its own comment instead of stacking a new one per push. */
export const COMMENT_MARKER = '<!-- speccy-report -->';

const DIFF_ORDER: DiffSeverity[] = ['breaking', 'warning', 'compatible', 'documentation'];
const DIFF_LABELS: Record<DiffSeverity, string> = { breaking: 'Breaking', warning: 'Warning', compatible: 'Compatible', documentation: 'Documentation' };
const LINT_ORDER: DiagnosticSeverity[] = ['issue', 'warning', 'suggestion'];
const LINT_LABELS: Record<DiagnosticSeverity, string> = { issue: 'Issue', warning: 'Warning', suggestion: 'Suggestion' };

const COLORS: Record<string, string> = { breaking: '[31m', issue: '[31m', warning: '[33m', compatible: '[32m', suggestion: '[36m', documentation: '[90m' };

interface FormatOptions {
  color?: boolean;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function countBy<T extends string>(values: T[], order: T[]): Array<[T, number]> {
  return order.map((severity) => [severity, values.filter((value) => value === severity).length] as [T, number]);
}

function versionLabel(spec: DiffSpecVersion, fallback: string) {
  return [spec.title, spec.version].filter(Boolean).join(' ') || fallback;
}

/** The operation a change belongs to, or the operations a shared component change reaches. */
function whereFor(change: ApiChange): string | undefined {
  if (change.method && change.path) return `${change.method.toUpperCase()} ${change.path}`;
  const affected = change.affectedOperations ?? [];
  if (affected.length) return affected.map((item) => item.operationId ?? `${item.method.toUpperCase()} ${item.path}`).join(', ');
  return undefined;
}

/** Document-level changes already name themselves, and operation messages often repeat the prefix. */
function describe(change: ApiChange, emphasis: (text: string) => string): string {
  const where = whereFor(change);
  return where && !change.message.startsWith(where) ? `${emphasis(where)} — ${change.message}` : change.message;
}

function diffHeadline(report: DiffReport) {
  const breaking = report.changes.filter((change) => change.severity === 'breaking').length;
  if (report.changes.length === 0) return 'No API changes';
  if (breaking > 0) return `Speccy found ${plural(breaking, 'breaking change')}`;
  return `Speccy found ${plural(report.changes.length, 'API change')}`;
}

function paint(text: string, severity: string, color: boolean) {
  return color && COLORS[severity] ? `${COLORS[severity]}${text}[0m` : text;
}

export function formatDiff(report: DiffReport, format: Format, options: FormatOptions = {}): string {
  if (format === 'json') return `${JSON.stringify(report, null, 2)}\n`;

  const counts = countBy(report.changes.map((change) => change.severity), DIFF_ORDER).filter(([, count]) => count > 0);
  const versions = `${versionLabel(report.base, 'the base')} to ${versionLabel(report.revision, 'this revision')}`;
  const grouped = DIFF_ORDER.map((severity) => [severity, report.changes.filter((change) => change.severity === severity)] as const).filter(([, changes]) => changes.length > 0);

  if (format === 'markdown') {
    const lines = [COMMENT_MARKER, '', `### ${diffHeadline(report)}`, ''];
    if (report.changes.length === 0) {
      lines.push(`Comparing ${versions} found nothing to report.`, '');
      return lines.join('\n');
    }
    lines.push(`Comparing ${versions}.`, '', counts.map(([severity, count]) => `${DIFF_LABELS[severity]} ${count}`).join(' · '), '');
    for (const [severity, changes] of grouped) {
      const body = changes.map((change) => `- ${describe(change, (text) => `**${text}**`)}`);
      if (severity === 'breaking') lines.push(`#### ${DIFF_LABELS[severity]}`, '', ...body, '');
      else lines.push('<details>', `<summary>${plural(changes.length, `${DIFF_LABELS[severity].toLowerCase()} change`)}</summary>`, '', ...body, '', '</details>', '');
    }
    return lines.join('\n');
  }

  const color = options.color ?? false;
  if (report.changes.length === 0) return `No API changes comparing ${versions}.\n`;
  const lines = [`${diffHeadline(report)} comparing ${versions}.`, counts.map(([severity, count]) => `${count} ${severity}`).join(', '), ''];
  for (const [severity, changes] of grouped) {
    lines.push(paint(`${DIFF_LABELS[severity]}:`, severity, color));
    for (const change of changes) lines.push(`  ${describe(change, (text) => text)}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

export function formatLint(diagnostics: ApiDiagnostic[], format: Format, options: FormatOptions = {}): string {
  if (format === 'json') return `${JSON.stringify(diagnostics, null, 2)}\n`;

  const counts = countBy(diagnostics.map((diagnostic) => diagnostic.severity), LINT_ORDER);
  const summary = counts.map(([severity, count]) => plural(count, severity)).join(', ');
  const grouped = LINT_ORDER.map((severity) => [severity, diagnostics.filter((diagnostic) => diagnostic.severity === severity)] as const).filter(([, items]) => items.length > 0);
  const where = (diagnostic: ApiDiagnostic) => diagnostic.operationId ?? diagnostic.path.join(' / ') ?? diagnostic.ruleId;

  if (format === 'markdown') {
    const lines = [COMMENT_MARKER, ''];
    if (diagnostics.length === 0) return [...lines, '### Speccy: No problems found', ''].join('\n');
    lines.push(`### Speccy found ${summary}`, '');
    for (const [severity, items] of grouped) {
      const body = items.map((item) => `- \`${item.ruleId}\` **${where(item)}** — ${item.message}${item.suggestion ? ` ${item.suggestion}` : ''}`);
      if (severity === 'issue') lines.push(`#### ${LINT_LABELS[severity]}s`, '', ...body, '');
      else lines.push('<details>', `<summary>${plural(items.length, severity)}</summary>`, '', ...body, '', '</details>', '');
    }
    return lines.join('\n');
  }

  const color = options.color ?? false;
  if (diagnostics.length === 0) return 'No problems found.\n';
  const lines = [`Speccy found ${summary}.`, ''];
  for (const [severity, items] of grouped) {
    lines.push(paint(`${LINT_LABELS[severity]}s:`, severity, color));
    for (const item of items) {
      lines.push(`  ${item.ruleId} ${where(item)} — ${item.message}`);
      if (item.suggestion) lines.push(`    ${item.suggestion}`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

export function diffExitCode(report: DiffReport, threshold: DiffThreshold): number {
  if (threshold === 'never') return 0;
  const limit = DIFF_ORDER.indexOf(threshold);
  return report.changes.some((change) => DIFF_ORDER.indexOf(change.severity) <= limit) ? 1 : 0;
}

export function lintExitCode(diagnostics: ApiDiagnostic[], threshold: LintThreshold): number {
  if (threshold === 'never') return 0;
  const limit = LINT_ORDER.indexOf(threshold);
  return diagnostics.some((diagnostic) => LINT_ORDER.indexOf(diagnostic.severity) <= limit) ? 1 : 0;
}
