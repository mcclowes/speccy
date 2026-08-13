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
import type { OpenAPIDocument } from 'speccy-core';
import { CodeBlock, CodeLines, CollapsibleJson, CopyButton } from './CodeBlock';
import { ApiPath, MethodBadge } from './DesignSystem';
import {
  deriveOperationPreviewData,
  mergeOperationPreviewRequestValues,
  type OperationPreviewRequestValues,
} from './operationPreviewData';
import styles from './OperationReference.module.css';

export type { OperationPreviewRequestValues } from './operationPreviewData';

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
  /** OpenAPI document used to derive examples when explicit examples are omitted. */
  spec?: OpenAPIDocument | string;
  /** Overrides derived path, query, header, or body values by section. */
  requestValues?: OperationPreviewRequestValues;
  /** Overrides the request body derived from `spec`. */
  requestExample?: string;
  /** Overrides the response example derived from `spec`. */
  responseExample?: string;
}

function formatExample(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function requestPath(path: string, values: Record<string, unknown>): string {
  return Object.entries(values).reduce(
    (result, [name, value]) =>
      result.replace(`{${name}}`, encodeURIComponent(String(value))),
    path,
  );
}

function hasValues(values: Record<string, unknown> | undefined): boolean {
  return Boolean(values && Object.keys(values).length);
}

function RequestPreviewSection({
  label,
  value,
  rawValue,
}: {
  label: string;
  value: string;
  rawValue?: unknown;
}) {
  return (
    <section className={styles.requestSection}>
      <header>
        <span>{label}</span>
        <CopyButton
          value={value}
          label={`Copy ${label.toLowerCase()}`}
          compact
        />
      </header>
      <pre>
        <code>
          {rawValue !== undefined && typeof rawValue !== 'string' ? (
            <CollapsibleJson value={rawValue} />
          ) : (
            <CodeLines value={value} />
          )}
        </code>
      </pre>
    </section>
  );
}

function RequestPreview({
  path,
  values,
}: {
  path: string;
  values: OperationPreviewRequestValues;
}) {
  const sections = [
    { label: 'Path', value: requestPath(path, values.path ?? {}) },
    ...(hasValues(values.query)
      ? [
          {
            label: 'Query parameters',
            value: formatExample(values.query)!,
            rawValue: values.query,
          },
        ]
      : []),
    ...(hasValues(values.headers)
      ? [
          {
            label: 'Headers',
            value: formatExample(values.headers)!,
            rawValue: values.headers,
          },
        ]
      : []),
    ...('body' in values
      ? [
          {
            label: 'Body',
            value: formatExample(values.body)!,
            rawValue: values.body,
          },
        ]
      : []),
  ];

  return (
    <div className={styles.requestSections}>
      {sections.map((section) => (
        <RequestPreviewSection {...section} key={section.label} />
      ))}
    </div>
  );
}

export function OperationPreview({
  method,
  path,
  href,
  spec,
  requestValues,
  requestExample,
  responseExample,
  className,
  onClick,
}: OperationPreviewProps) {
  const [tab, setTab] = useState<'request' | 'response'>('request');
  const derived = deriveOperationPreviewData(spec, method, path);
  const request = mergeOperationPreviewRequestValues(
    derived.request,
    requestValues,
  );
  if (requestExample !== undefined) request.body = requestExample;
  const response = responseExample ?? formatExample(derived.response);
  const hasRequest = true;
  const hasResponse = response !== undefined;
  const tabs = [
    ...(hasRequest ? (['request'] as const) : []),
    ...(hasResponse ? (['response'] as const) : []),
  ];
  const activeTab = tab === 'response' && hasResponse ? 'response' : tabs[0];

  return (
    <section className={referenceClassName(styles.operationPreview, className)}>
      <header className={styles.previewHeader}>
        <EndpointIdentity method={method} path={path} />
        <a href={href} onClick={onClick}>
          Open API reference <span aria-hidden="true">→</span>
        </a>
      </header>
      {tabs.length > 1 && (
        <div className={styles.previewTabs} role="tablist" aria-label="Example">
          {tabs.map((name) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === name}
              onClick={() => setTab(name)}
              key={name}
            >
              {name[0]!.toUpperCase() + name.slice(1)}
            </button>
          ))}
        </div>
      )}
      {activeTab === 'request' ? (
        <div
          className={styles.previewCode}
          role={tabs.length > 1 ? 'tabpanel' : undefined}
        >
          <RequestPreview path={path} values={request} />
        </div>
      ) : response !== undefined ? (
        <div
          className={styles.previewCode}
          role={tabs.length > 1 ? 'tabpanel' : undefined}
        >
          <CodeBlock
            value={response}
            copyPlacement="body"
            copyLabel="Copy response"
            truncateLabel="response"
          />
        </div>
      ) : null}
    </section>
  );
}
