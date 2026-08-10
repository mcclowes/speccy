/**
 * ---
 * purpose: Provides the shared copy action and code presentation used across the renderer.
 * related:
 *   - ./Speccy.tsx - Renders request and response samples.
 *   - ./SchemaView.tsx - Renders inline OpenAPI examples.
 * ---
 */

import { useState, type ReactNode } from 'react';

const JSON_TOKEN_PATTERN = /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;

function highlightedJsonLine(line: string): ReactNode {
  const tokens: ReactNode[] = [];
  let cursor = 0;

  for (const match of line.matchAll(JSON_TOKEN_PATTERN)) {
    const index = match.index;
    if (index > cursor) tokens.push(line.slice(cursor, index));
    const type = match[1] ? 'key' : match[2] ? 'string' : match[3] ? 'number' : 'literal';
    tokens.push(<span className={`sp-json-${type}`} key={index}>{match[0]}</span>);
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

function CodeLines({ value }: { value: string }) {
  let isJson = true;
  try {
    JSON.parse(value);
  } catch {
    isJson = false;
  }

  return (
    <>
      {value.split('\n').map((line, index) => (
        <span className="sp-code-line" key={index}>{isJson ? highlightedJsonLine(line) : line}</span>
      ))}
    </>
  );
}

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return <button className={`sp-copy${copied ? ' is-copied' : ''}`} type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>;
}

export function CodeBlock({
  value,
  copyValue = value,
  title,
  className = '',
  copyable = true,
  lineNumbers = false,
}: {
  value: string;
  copyValue?: string;
  title?: ReactNode;
  className?: string;
  copyable?: boolean;
  lineNumbers?: boolean;
}) {
  return (
    <div className={`sp-code-block ${className}`.trim()}>
      {(title || copyable) && (
        <div className={`sp-code-title${!title && copyable ? ' sp-code-title-copy-only' : ''}`}>
          <span>{title}</span>
          {copyable && <CopyButton value={copyValue} />}
        </div>
      )}
      <pre className={lineNumbers ? 'sp-code-numbered' : ''}>
        <code>{lineNumbers ? <CodeLines value={value} /> : highlightedJson(value)}</code>
      </pre>
    </div>
  );
}
