/**
 * ---
 * purpose: Turns diff reports and diagnostics into terminal, JSON, and pull request output.
 * related:
 *   - ./cli.ts - Chooses a format and an exit threshold from the command line.
 * ---
 */

import type {
  ApiChange,
  ApiDiagnostic,
  DiagnosticSeverity,
  DiffReport,
  DiffSeverity,
  DiffSpecVersion,
} from 'speccy-core';

export type Format = 'pretty' | 'json' | 'markdown';
export type DiffThreshold = DiffSeverity | 'never';
export type LintThreshold = DiagnosticSeverity | 'never';

/** Lets the action find and edit its own comment instead of stacking a new one per push. */
export const COMMENT_MARKER = '<!-- speccy-report -->';

const DIFF_ORDER: DiffSeverity[] = [
  'breaking',
  'warning',
  'compatible',
  'documentation',
];
const DIFF_LABELS: Record<DiffSeverity, string> = {
  breaking: 'Breaking',
  warning: 'Warning',
  compatible: 'Compatible',
  documentation: 'Documentation',
};
const AREA_LABELS: Record<string, string> = {
  operation: 'Operation',
  parameters: 'Parameters',
  'request-body': 'Request body',
  'response-body': 'Response body',
  headers: 'Headers',
  security: 'Security',
  documentation: 'Documentation',
};
const LINT_ORDER: DiagnosticSeverity[] = ['issue', 'warning', 'suggestion'];
const LINT_LABELS: Record<DiagnosticSeverity, string> = {
  issue: 'Issue',
  warning: 'Warning',
  suggestion: 'Suggestion',
};

const COLORS: Record<string, string> = {
  breaking: '[31m',
  issue: '[31m',
  warning: '[33m',
  compatible: '[32m',
  suggestion: '[36m',
  documentation: '[90m',
};

interface FormatOptions {
  color?: boolean;
}

interface OperationTarget {
  method: string;
  path: string;
  operationId?: string;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function countBy<T extends string>(
  values: T[],
  order: T[],
): Array<[T, number]> {
  return order.map(
    (severity) =>
      [severity, values.filter((value) => value === severity).length] as [
        T,
        number,
      ],
  );
}

/** Non-empty severity buckets, in display order. */
function groupBySeverity<T extends string, V extends { severity: T }>(
  values: V[],
  order: T[],
): Array<[T, V[]]> {
  return order
    .map(
      (severity) =>
        [severity, values.filter((value) => value.severity === severity)] as [
          T,
          V[],
        ],
    )
    .filter(([, items]) => items.length > 0);
}

function versionLabel(spec: DiffSpecVersion, fallback: string) {
  return [spec.title, spec.version].filter(Boolean).join(' ') || fallback;
}

function versionsLabel(report: DiffReport) {
  return `${versionLabel(report.base, 'the base')} to ${versionLabel(report.revision, 'this revision')}`;
}

function routeLabel(target: OperationTarget) {
  return `${target.method.toUpperCase()} ${target.path}`;
}

/** The operation a change belongs to, or the operations a shared component change reaches. */
function operationTargets(change: ApiChange): OperationTarget[] {
  if (change.method && change.path)
    return [
      {
        method: change.method,
        path: change.path,
        operationId: change.operationId,
      },
    ];
  return change.affectedOperations ?? [];
}

function whereFor(change: ApiChange): string | undefined {
  if (change.method && change.path)
    return routeLabel({ method: change.method, path: change.path });
  const affected = change.affectedOperations ?? [];
  if (affected.length)
    return affected
      .map((item) => item.operationId ?? routeLabel(item))
      .join(', ');
  return undefined;
}

/** Document-level changes already name themselves, and operation messages often repeat the prefix. */
function describe(
  change: ApiChange,
  emphasis: (text: string) => string,
): string {
  const where = whereFor(change);
  return where && !change.message.startsWith(where)
    ? `${emphasis(where)} — ${change.message}`
    : change.message;
}

function diffHeadline(report: DiffReport) {
  const breaking = report.changes.filter(
    (change) => change.severity === 'breaking',
  ).length;
  if (report.changes.length === 0) return 'No API changes';
  if (breaking > 0)
    return `Speccy found ${plural(breaking, 'breaking change')}`;
  return `Speccy found ${plural(report.changes.length, 'API change')}`;
}

function markdownCell(value: string) {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function operationCell(change: ApiChange) {
  const cells = operationTargets(change).map((target) => {
    const route = `\`${routeLabel(target)}\``;
    return target.operationId ? `${route}<br>\`${target.operationId}\`` : route;
  });
  return cells.length ? cells.join('<br>') : 'API';
}

function markdownValue(value: unknown) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return `\`${String(serialized).replace(/`/g, '\\`')}\``;
}

function paint(text: string, severity: string, color: boolean) {
  return color && COLORS[severity] ? `${COLORS[severity]}${text}[0m` : text;
}

function markdownDiff(report: DiffReport): string {
  const breaking = report.changes.some(
    (change) => change.severity === 'breaking',
  );
  const verdict = breaking
    ? '❌ API compatibility check failed'
    : '✅ API compatibility check passed';
  const counts = countBy(
    report.changes.map((change) => change.severity),
    DIFF_ORDER,
  );
  const lines = [
    COMMENT_MARKER,
    '',
    `### ${verdict}`,
    '',
    `**${counts.map(([severity, count]) => `${count} ${severity}`).join(' · ')}**`,
    '',
  ];
  if (report.base.source || report.revision.source) {
    lines.push(
      `${report.base.source ? `\`${report.base.source}\`` : 'Base'} → ${report.revision.source ? `\`${report.revision.source}\`` : 'Revision'}`,
      '',
    );
  } else {
    lines.push(`Comparing ${versionsLabel(report)}.`, '');
  }
  if (report.changes.length === 0) {
    lines.push('No API changes found.', '');
    return lines.join('\n');
  }
  lines.push(
    '| Impact | Operation | Area | Change |',
    '| --- | --- | --- | --- |',
  );
  for (const change of report.changes) {
    lines.push(
      `| ${DIFF_LABELS[change.severity]} | ${operationCell(change)} | ${AREA_LABELS[change.scope?.area ?? ''] ?? 'API'} | ${markdownCell(change.message)} |`,
    );
  }
  lines.push('', '<details>', '<summary>Technical details</summary>', '');
  for (const change of report.changes) {
    lines.push(
      `- **${markdownCell(change.message)}**`,
      `  - OpenAPI location: \`${change.location.join(' › ')}\``,
    );
    if (change.before !== undefined)
      lines.push(`  - Before: ${markdownValue(change.before)}`);
    if (change.after !== undefined)
      lines.push(`  - After: ${markdownValue(change.after)}`);
  }
  lines.push('', '</details>', '', 'Breaking changes fail this check.', '');
  return lines.join('\n');
}

function prettyDiff(report: DiffReport, color: boolean): string {
  const versions = versionsLabel(report);
  if (report.changes.length === 0)
    return `No API changes comparing ${versions}.\n`;
  const counts = countBy(
    report.changes.map((change) => change.severity),
    DIFF_ORDER,
  ).filter(([, count]) => count > 0);
  const lines = [
    `${diffHeadline(report)} comparing ${versions}.`,
    counts.map(([severity, count]) => `${count} ${severity}`).join(', '),
    '',
  ];
  for (const [severity, changes] of groupBySeverity(
    report.changes,
    DIFF_ORDER,
  )) {
    lines.push(paint(`${DIFF_LABELS[severity]}:`, severity, color));
    for (const change of changes)
      lines.push(`  ${describe(change, (text) => text)}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

export function formatDiff(
  report: DiffReport,
  format: Format,
  options: FormatOptions = {},
): string {
  switch (format) {
    case 'json':
      return `${JSON.stringify(report, null, 2)}\n`;
    case 'markdown':
      return markdownDiff(report);
    case 'pretty':
      return prettyDiff(report, options.color ?? false);
  }
}

function lintSummary(diagnostics: ApiDiagnostic[]) {
  return countBy(
    diagnostics.map((diagnostic) => diagnostic.severity),
    LINT_ORDER,
  )
    .map(([severity, count]) => plural(count, severity))
    .join(', ');
}

function lintWhere(diagnostic: ApiDiagnostic) {
  return (
    diagnostic.operationId ?? diagnostic.path.join(' / ') ?? diagnostic.ruleId
  );
}

function markdownLint(diagnostics: ApiDiagnostic[]): string {
  const lines = [COMMENT_MARKER, ''];
  if (diagnostics.length === 0)
    return [...lines, '### ✅ API health: No problems found', ''].join('\n');
  lines.push(
    `### API health: ${lintSummary(diagnostics)}`,
    '',
    'Health findings are advisory and do not fail this check.',
    '',
  );
  for (const [severity, items] of groupBySeverity(diagnostics, LINT_ORDER)) {
    const body = items.map(
      (item) =>
        `- \`${item.ruleId}\` **${lintWhere(item)}** — ${item.message}${item.suggestion ? ` ${item.suggestion}` : ''}`,
    );
    if (severity === 'issue')
      lines.push(`#### ${LINT_LABELS[severity]}s`, '', ...body, '');
    else
      lines.push(
        '<details>',
        `<summary>${plural(items.length, severity)}</summary>`,
        '',
        ...body,
        '',
        '</details>',
        '',
      );
  }
  return lines.join('\n');
}

function prettyLint(diagnostics: ApiDiagnostic[], color: boolean): string {
  if (diagnostics.length === 0) return 'No problems found.\n';
  const lines = [`Speccy found ${lintSummary(diagnostics)}.`, ''];
  for (const [severity, items] of groupBySeverity(diagnostics, LINT_ORDER)) {
    lines.push(paint(`${LINT_LABELS[severity]}s:`, severity, color));
    for (const item of items) {
      lines.push(`  ${item.ruleId} ${lintWhere(item)} — ${item.message}`);
      if (item.suggestion) lines.push(`    ${item.suggestion}`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

export function formatLint(
  diagnostics: ApiDiagnostic[],
  format: Format,
  options: FormatOptions = {},
): string {
  switch (format) {
    case 'json':
      return `${JSON.stringify(diagnostics, null, 2)}\n`;
    case 'markdown':
      return markdownLint(diagnostics);
    case 'pretty':
      return prettyLint(diagnostics, options.color ?? false);
  }
}

export function diffExitCode(
  report: DiffReport,
  threshold: DiffThreshold,
): number {
  if (threshold === 'never') return 0;
  const limit = DIFF_ORDER.indexOf(threshold);
  return report.changes.some(
    (change) => DIFF_ORDER.indexOf(change.severity) <= limit,
  )
    ? 1
    : 0;
}

export function lintExitCode(
  diagnostics: ApiDiagnostic[],
  threshold: LintThreshold,
): number {
  if (threshold === 'never') return 0;
  const limit = LINT_ORDER.indexOf(threshold);
  return diagnostics.some(
    (diagnostic) => LINT_ORDER.indexOf(diagnostic.severity) <= limit,
  )
    ? 1
    : 0;
}
