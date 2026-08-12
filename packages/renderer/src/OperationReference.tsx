/**
 * ---
 * purpose: Renders portable links, strips, cards, and example previews that connect prose documentation to API operations.
 * related:
 *   - ./DesignSystem.tsx - Supplies the shared method badge and API path presentation.
 *   - ./CodeBlock.tsx - Presents request and response examples in operation previews.
 *   - ./OperationReference.module.css - Styles the four documentation treatments.
 * ---
 */

import { useState, type MouseEventHandler } from 'react';
import { CodeBlock } from './CodeBlock';
import { ApiPath, MethodBadge } from './DesignSystem';
import styles from './OperationReference.module.css';

export interface OperationReferenceProps {
  method: string;
  path: string;
  href: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export interface DescribedOperationReferenceProps extends OperationReferenceProps {
  summary: string;
  description?: string;
}

function referenceClassName(style?: string, className?: string): string {
  return `speccy sp-operation-reference ${style} ${className}`.trim();
}

function EndpointIdentity({
  method,
  path,
  compact = false,
}: {
  method: string;
  path: string;
  compact?: boolean;
}) {
  return (
    <span className={styles.endpointIdentity}>
      <MethodBadge method={method} compact={compact} />
      <ApiPath value={path} wrap />
    </span>
  );
}

export function OperationLink({
  method,
  path,
  href,
  className,
  onClick,
}: OperationReferenceProps) {
  return (
    <a
      className={referenceClassName(styles.inlineLink, className)}
      href={href}
      onClick={onClick}
    >
      <MethodBadge method={method} compact />
      <ApiPath value={path} wrap />
    </a>
  );
}

export function EndpointStrip({
  method,
  path,
  href,
  className,
  onClick,
}: OperationReferenceProps) {
  return (
    <a
      className={referenceClassName(styles.endpointStrip, className)}
      href={href}
      onClick={onClick}
    >
      <EndpointIdentity method={method} path={path} />
      <span className={styles.action}>
        Open reference <span aria-hidden="true">→</span>
      </span>
    </a>
  );
}

export function OperationCard({
  method,
  path,
  summary,
  description,
  href,
  className,
  onClick,
}: DescribedOperationReferenceProps) {
  return (
    <a
      className={referenceClassName(styles.referenceCard, className)}
      href={href}
      onClick={onClick}
    >
      <EndpointIdentity method={method} path={path} compact />
      <strong>{summary}</strong>
      {description && (
        <span className={styles.cardDescription}>{description}</span>
      )}
      <span className={styles.cardAction}>
        View operation <span aria-hidden="true">→</span>
      </span>
    </a>
  );
}

export interface OperationPreviewProps extends OperationReferenceProps {
  requestExample: string;
  responseExample?: string;
}

export function OperationPreview({
  method,
  path,
  href,
  requestExample,
  responseExample,
  className,
  onClick,
}: OperationPreviewProps) {
  const [tab, setTab] = useState<'request' | 'response'>('request');
  const hasResponse = responseExample !== undefined;
  const value =
    tab === 'response' && hasResponse ? responseExample : requestExample;

  return (
    <section className={referenceClassName(styles.operationPreview, className)}>
      <header className={styles.previewHeader}>
        <EndpointIdentity method={method} path={path} />
        <a href={href} onClick={onClick}>
          Open API reference <span aria-hidden="true">→</span>
        </a>
      </header>
      {hasResponse && (
        <div className={styles.previewTabs} role="tablist" aria-label="Example">
          {(['request', 'response'] as const).map((name) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              key={name}
            >
              {name[0]!.toUpperCase() + name.slice(1)}
            </button>
          ))}
        </div>
      )}
      <div
        className={styles.previewCode}
        role={hasResponse ? 'tabpanel' : undefined}
      >
        <CodeBlock
          value={value}
          copyPlacement="body"
          copyLabel={`Copy ${tab}`}
          truncateLabel={tab}
        />
      </div>
    </section>
  );
}
