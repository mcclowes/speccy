/**
 * ---
 * purpose: Provides the shared copy action and code presentation used across the renderer.
 * related:
 *   - ./Speccy.tsx - Renders request and response samples.
 *   - ./SchemaView.tsx - Renders inline OpenAPI examples.
 * ---
 */

import { useState, type ReactNode } from 'react';

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return <button className="sp-copy" type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>;
}

export function CodeBlock({
  value,
  copyValue = value,
  title,
  className = '',
  copyable = true,
}: {
  value: string;
  copyValue?: string;
  title?: ReactNode;
  className?: string;
  copyable?: boolean;
}) {
  return (
    <div className={`sp-code-block ${className}`.trim()}>
      {(title || copyable) && (
        <div className={`sp-code-title${!title && copyable ? ' sp-code-title-copy-only' : ''}`}>
          <span>{title}</span>
          {copyable && <CopyButton value={copyValue} />}
        </div>
      )}
      <pre><code>{value}</code></pre>
    </div>
  );
}
