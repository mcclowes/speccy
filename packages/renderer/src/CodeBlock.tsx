/**
 * ---
 * purpose: Provides the shared copy action and code presentation used across the renderer.
 * related:
 *   - ./Speccy.tsx - Renders request and response samples.
 *   - ./SchemaView.tsx - Renders inline OpenAPI examples.
 * ---
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './CodeBlock.module.css';

const jsonClass = {
  key: styles.jsonKey,
  string: styles.jsonString,
  number: styles.jsonNumber,
  literal: styles.jsonLiteral,
};

const JSON_TOKEN_PATTERN =
  /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;

function highlightedJsonLine(line: string): ReactNode {
  const tokens: ReactNode[] = [];
  let cursor = 0;

  for (const match of line.matchAll(JSON_TOKEN_PATTERN)) {
    const index = match.index;
    if (index > cursor) tokens.push(line.slice(cursor, index));
    const type = match[1]
      ? 'key'
      : match[2]
        ? 'string'
        : match[3]
          ? 'number'
          : 'literal';
    tokens.push(
      <span className={`sp-json-${type} ${jsonClass[type]}`} key={index}>
        {match[0]}
      </span>,
    );
    cursor = index + match[0].length;
  }

  if (cursor < line.length) tokens.push(line.slice(cursor));
  return tokens;
}

function highlightedJson(value: string): ReactNode {
  try {
    JSON.parse(value);
  } catch {
    return value;
  }

  return highlightedJsonLine(value);
}

export function CodeLines({ value }: { value: string }) {
  let isJson = true;
  try {
    JSON.parse(value);
  } catch {
    isJson = false;
  }

  return (
    <>
      {value.split('\n').map((line, index) => (
        <span className={`sp-code-line ${styles.line}`} key={index}>
          {isJson ? highlightedJsonLine(line) : line}
        </span>
      ))}
    </>
  );
}

function highlightedJsonPrimitive(value: unknown): ReactNode {
  if (typeof value === 'string')
    return (
      <span className={`sp-json-string ${styles.jsonString}`}>
        {JSON.stringify(value)}
      </span>
    );
  if (typeof value === 'number')
    return (
      <span className={`sp-json-number ${styles.jsonNumber}`}>
        {JSON.stringify(value)}
      </span>
    );
  return (
    <span className={`sp-json-literal ${styles.jsonLiteral}`}>
      {value === undefined ? 'null' : JSON.stringify(value)}
    </span>
  );
}

function FoldToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`sp-code-fold ${styles.fold}`}
      aria-label={collapsed ? 'Expand' : 'Collapse'}
      aria-expanded={!collapsed}
      onClick={onToggle}
    >
      <span aria-hidden="true" />
    </button>
  );
}

function jsonRows({
  value,
  depth,
  keyLabel,
  trailingComma,
  path,
  collapsed,
  toggle,
}: {
  value: unknown;
  depth: number;
  keyLabel?: ReactNode;
  trailingComma: boolean;
  path: string;
  collapsed: Set<string>;
  toggle: (path: string) => void;
}): ReactNode[] {
  const indent = '  '.repeat(depth);
  const comma = trailingComma ? ',' : '';

  const container = Array.isArray(value)
    ? 'array'
    : value !== null && typeof value === 'object'
      ? 'object'
      : null;
  if (!container) {
    return [
      <span className={`sp-code-line ${styles.line}`} key={path}>
        {indent}
        {keyLabel}
        {highlightedJsonPrimitive(value)}
        {comma}
      </span>,
    ];
  }

  const [openChar, closeChar] = container === 'array' ? ['[', ']'] : ['{', '}'];
  const entries =
    container === 'array'
      ? (value as unknown[]).map((item, index) => ({
          key: undefined as string | undefined,
          value: item,
          pathPart: `[${index}]`,
        }))
      : Object.entries(value as Record<string, unknown>)
          .filter(([, entryValue]) => entryValue !== undefined)
          .map(([key, entryValue]) => ({
            key,
            value: entryValue,
            pathPart: `.${key}`,
          }));

  if (entries.length === 0) {
    return [
      <span className={`sp-code-line ${styles.line}`} key={path}>
        {indent}
        {keyLabel}
        {openChar}
        {closeChar}
        {comma}
      </span>,
    ];
  }

  const isCollapsed = collapsed.has(path);
  const count = entries.length;
  const summary =
    container === 'array'
      ? `${count} item${count === 1 ? '' : 's'}`
      : `${count} key${count === 1 ? '' : 's'}`;

  const openRow = (
    <span className={`sp-code-line ${styles.line}`} key={`${path}-open`}>
      {indent}
      <FoldToggle collapsed={isCollapsed} onToggle={() => toggle(path)} />
      {keyLabel}
      {openChar}
      {isCollapsed && (
        <span className={`sp-code-fold-summary ${styles.foldSummary}`}>
          {summary}
        </span>
      )}
      {isCollapsed && `${closeChar}${comma}`}
    </span>
  );

  if (isCollapsed) return [openRow];

  const childRows = entries.flatMap((entry, index) =>
    jsonRows({
      value: entry.value,
      depth: depth + 1,
      keyLabel:
        entry.key !== undefined ? (
          <>
            <span className={`sp-json-key ${styles.jsonKey}`}>
              {JSON.stringify(entry.key)}
            </span>
            {': '}
          </>
        ) : undefined,
      trailingComma: index < entries.length - 1,
      path: `${path}${entry.pathPart}`,
      collapsed,
      toggle,
    }),
  );

  const closeRow = (
    <span className={`sp-code-line ${styles.line}`} key={`${path}-close`}>
      {indent}
      {closeChar}
      {comma}
    </span>
  );
  return [openRow, ...childRows, closeRow];
}

export function CollapsibleJson({ value }: { value: unknown }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <>
      {jsonRows({
        value,
        depth: 0,
        trailingComma: false,
        path: 'root',
        collapsed,
        toggle,
      })}
    </>
  );
}

const TRUNCATE_LINE_THRESHOLD = 35;

export function TruncatedCode({
  value,
  label,
  lines = value.split('\n').length,
  threshold = TRUNCATE_LINE_THRESHOLD,
  panel = false,
  children,
}: {
  value: string;
  label: string;
  /** Line count used to decide whether to clip; defaults to the lines in `value`. */
  lines?: number;
  /** Clip once the content exceeds this many lines. */
  threshold?: number;
  /** Clip the whole child panel rather than the `pre` inside it. */
  panel?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  if (lines <= threshold) return <>{children}</>;

  return (
    <div
      className={`sp-code-clip ${styles.clip}${panel ? ` sp-code-clip-panel ${styles.clipPanel}` : ''}${expanded ? '' : ` is-truncated ${styles.truncated}`}`}
    >
      <div className={`sp-code-clip-window ${styles.clipWindow}`}>
        {children}
      </div>
      <button
        type="button"
        className={`sp-code-expand ${styles.expand}`}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Show less' : `Show full ${label}`}
      </button>
    </div>
  );
}

export function CopyButton({
  value,
  label = 'Copy',
  compact = false,
}: {
  value: string;
  label?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const mounted = useRef(false);
  const copiedTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (copiedTimer.current !== undefined)
        window.clearTimeout(copiedTimer.current);
    };
  }, []);

  async function copy() {
    await navigator.clipboard?.writeText(value);
    if (!mounted.current) return;
    if (copiedTimer.current !== undefined)
      window.clearTimeout(copiedTimer.current);
    setCopied(true);
    copiedTimer.current = window.setTimeout(() => {
      setCopied(false);
      copiedTimer.current = undefined;
    }, 1200);
  }

  return (
    <button
      className={`sp-copy ${styles.copy}${compact ? ` sp-copy-compact ${styles.copyCompact}` : ''}${copied ? ` is-copied ${styles.copied}` : ''}`}
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
    >
      {!compact && (copied ? 'Copied' : label)}
    </button>
  );
}

export function CodeBlock({
  value,
  copyValue = value,
  title,
  className = '',
  copyable = true,
  copyPlacement = 'title',
  copyLabel = 'Copy',
  lineNumbers = false,
  collapsibleValue,
  truncateLabel,
}: {
  value: string;
  copyValue?: string;
  title?: ReactNode;
  className?: string;
  copyable?: boolean;
  copyPlacement?: 'title' | 'body';
  copyLabel?: string;
  lineNumbers?: boolean;
  /** Raw (pre-serialization) JSON value. When set, renders as a foldable tree instead of the flat `value` text; `value` still drives copying. */
  collapsibleValue?: unknown;
  /** When set, long values start clipped behind a "Show full <label>" toggle. */
  truncateLabel?: string;
}) {
  const code = (
    <pre className={lineNumbers ? `sp-code-numbered ${styles.numbered}` : ''}>
      <code>
        {collapsibleValue !== undefined ? (
          <CollapsibleJson value={collapsibleValue} />
        ) : lineNumbers ? (
          <CodeLines value={value} />
        ) : (
          highlightedJson(value)
        )}
      </code>
    </pre>
  );

  return (
    <div className={`sp-code-block ${styles.block} ${className}`.trim()}>
      {(title || copyable) && (
        <div
          className={`sp-code-title ${styles.title}${!title && copyable ? ' sp-code-title-copy-only' : ''}`}
        >
          <span>{title}</span>
          {copyable && copyPlacement === 'title' && (
            <CopyButton value={copyValue} label={copyLabel} />
          )}
        </div>
      )}
      <div className={`sp-code-body ${styles.body}`}>
        {copyable && copyPlacement === 'body' && (
          <CopyButton value={copyValue} label={copyLabel} compact />
        )}
        {truncateLabel ? (
          <TruncatedCode value={value} label={truncateLabel}>
            {code}
          </TruncatedCode>
        ) : (
          code
        )}
      </div>
    </div>
  );
}
