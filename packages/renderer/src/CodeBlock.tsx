/**
 * ---
 * purpose: Provides the shared copy action and code presentation used across the renderer.
 * related:
 *   - ./Speccy.tsx - Renders request and response samples.
 *   - ./SchemaView.tsx - Renders inline OpenAPI examples.
 * ---
 */

import { useState, type ReactNode } from 'react';

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
      <span className={`sp-json-${type}`} key={index}>
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
        <span className="sp-code-line" key={index}>
          {isJson ? highlightedJsonLine(line) : line}
        </span>
      ))}
    </>
  );
}

function highlightedJsonPrimitive(value: unknown): ReactNode {
  if (typeof value === 'string')
    return <span className="sp-json-string">{JSON.stringify(value)}</span>;
  if (typeof value === 'number')
    return <span className="sp-json-number">{JSON.stringify(value)}</span>;
  return (
    <span className="sp-json-literal">
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
      className="sp-code-fold"
      aria-label={collapsed ? 'Expand' : 'Collapse'}
      onClick={onToggle}
    >
      {collapsed ? '▸' : '▾'}
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
      <span className="sp-code-line" key={path}>
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
      <span className="sp-code-line" key={path}>
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
    <span className="sp-code-line" key={`${path}-open`}>
      {indent}
      <FoldToggle collapsed={isCollapsed} onToggle={() => toggle(path)} />
      {keyLabel}
      {openChar}
      {isCollapsed && <span className="sp-code-fold-summary">{summary}</span>}
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
            <span className="sp-json-key">{JSON.stringify(entry.key)}</span>
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
    <span className="sp-code-line" key={`${path}-close`}>
      {indent}
      {closeChar}
      {comma}
    </span>
  );
  return [openRow, ...childRows, closeRow];
}

function CollapsibleJson({ value }: { value: unknown }) {
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

  async function copy() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      className={`sp-copy${compact ? ' sp-copy-compact' : ''}${copied ? ' is-copied' : ''}`}
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
  lineNumbers = false,
  collapsibleValue,
}: {
  value: string;
  copyValue?: string;
  title?: ReactNode;
  className?: string;
  copyable?: boolean;
  lineNumbers?: boolean;
  /** Raw (pre-serialization) JSON value. When set, renders as a foldable tree instead of the flat `value` text; `value` still drives copying. */
  collapsibleValue?: unknown;
}) {
  return (
    <div className={`sp-code-block ${className}`.trim()}>
      {(title || copyable) && (
        <div
          className={`sp-code-title${!title && copyable ? ' sp-code-title-copy-only' : ''}`}
        >
          <span>{title}</span>
          {copyable && <CopyButton value={copyValue} />}
        </div>
      )}
      <pre className={lineNumbers ? 'sp-code-numbered' : ''}>
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
    </div>
  );
}
