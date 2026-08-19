/**
 * ---
 * purpose: Renders portable links, strips, cards, and example previews that connect prose documentation to API operations.
 * related:
 *   - ./operationReferenceContext.tsx - Resolves hrefs and operations from OpenAPI documents.
 *   - ./DesignSystem.tsx - Supplies the shared method badge and API path presentation.
 *   - ./CodeBlock.tsx - Presents request and response examples in operation previews.
 *   - ./OperationReference.module.css - Styles the four documentation treatments.
 * ---
 */

import { useState, type MouseEventHandler } from 'react';
import type { OpenAPIDocument } from 'speccy-core';
import {
  CodeLines,
  CollapsibleJson,
  CopyButton,
  TruncatedCode,
} from './CodeBlock';
import { ApiPath, MethodBadge } from './DesignSystem';
import type { Theme } from './ThemeToggle';
import {
  deriveOperationPreviewDataFromOperation,
  mergeOperationPreviewRequestValues,
  type OperationPreviewRequestValues,
} from './operationPreviewData';
import {
  useOperationReference,
  type OperationReferenceLookup,
} from './operationReferenceContext';
import styles from './OperationReference.module.css';

export type { OperationPreviewRequestValues } from './operationPreviewData';
export {
  OperationReferenceProvider,
  resolveOperationReference,
  type OperationReferenceLookup,
  type OperationReferenceProviderProps,
  type OperationReferenceSource,
  type ResolvedOperationReference,
} from './operationReferenceContext';

interface OperationReferenceBaseProps {
  /**
   * Link to the full operation reference. Derived from `spec` or an
   * enclosing `OperationReferenceProvider` when omitted.
   */
  href?: string;
  /** OpenAPI document, or JSON or YAML string, used to derive `href` and examples. */
  spec?: OpenAPIDocument | string;
  /** Route where the reference for `spec` is mounted. Defaults to `/api`. */
  basePath?: string;
  /** Colour scheme. Defaults to `inherit`, which follows the host page's theme. */
  theme?: Theme;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export type OperationReferenceProps = OperationReferenceLookup &
  OperationReferenceBaseProps;

export type DescribedOperationReferenceProps = OperationReferenceProps & {
  summary: string;
  description?: string;
};

function referenceClassName(
  theme: Theme,
  style?: string,
  className?: string,
): string {
  return `speccy sp-theme-${theme} sp-operation-reference ${style ?? ''} ${className ?? ''}`
    .replace(/\s+/g, ' ')
    .trim();
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
  theme = 'inherit',
  className,
  onClick,
  ...lookup
}: OperationReferenceProps) {
  const { method, path, href } = useOperationReference(lookup);
  return (
    <a
      className={referenceClassName(theme, styles.inlineLink, className)}
      href={href}
      onClick={onClick}
    >
      <MethodBadge method={method} compact />
      <ApiPath value={path} wrap />
    </a>
  );
}

export function EndpointStrip({
  theme = 'inherit',
  className,
  onClick,
  ...lookup
}: OperationReferenceProps) {
  const { method, path, href } = useOperationReference(lookup);
  return (
    <a
      className={referenceClassName(theme, styles.endpointStrip, className)}
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
  summary,
  description,
  theme = 'inherit',
  className,
  onClick,
  ...lookup
}: DescribedOperationReferenceProps) {
  const { method, path, href } = useOperationReference(lookup);
  return (
    <a
      className={referenceClassName(theme, styles.referenceCard, className)}
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

export type OperationPreviewProps = OperationReferenceProps & {
  /** Overrides derived path, query, header, or body values by section. */
  requestValues?: OperationPreviewRequestValues;
  /** Overrides the request body derived from `spec`. Objects are formatted as JSON. */
  requestExample?: unknown;
  /** Overrides the response example derived from `spec`. Objects are formatted as JSON. */
  responseExample?: unknown;
};

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

interface PreviewSectionData {
  label: string;
  value: string;
  rawValue?: unknown;
}

function PreviewSection({ label, value, rawValue }: PreviewSectionData) {
  return (
    <section className={styles.previewSection}>
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

/** Combined line budget before a preview panel is clipped; each section header costs a few lines. */
const PREVIEW_TRUNCATE_LINES = 24;
const PREVIEW_SECTION_HEADER_LINES = 3;

function PreviewPanel({
  label,
  sections,
}: {
  label: string;
  sections: PreviewSectionData[];
}) {
  const lines = sections.reduce(
    (total, section) =>
      total + PREVIEW_SECTION_HEADER_LINES + section.value.split('\n').length,
    0,
  );
  return (
    <div className={styles.previewSections}>
      <TruncatedCode
        value=""
        lines={lines}
        threshold={PREVIEW_TRUNCATE_LINES}
        label={label}
        panel
      >
        {sections.map((section) => (
          <PreviewSection {...section} key={section.label} />
        ))}
      </TruncatedCode>
    </div>
  );
}

function requestSections(
  path: string,
  values: OperationPreviewRequestValues,
): PreviewSectionData[] {
  return [
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
}

export function OperationPreview({
  requestValues,
  requestExample,
  responseExample,
  theme = 'inherit',
  className,
  onClick,
  ...lookup
}: OperationPreviewProps) {
  const [tab, setTab] = useState<'request' | 'response'>('request');
  const { method, path, href, operation } = useOperationReference(lookup);
  const derived = deriveOperationPreviewDataFromOperation(
    operation?.pathItem,
    operation?.operation,
  );
  const request = mergeOperationPreviewRequestValues(
    derived.request,
    requestValues,
  );
  if (requestExample !== undefined) request.body = requestExample;
  const responseValue = responseExample ?? derived.response;
  const response = formatExample(responseValue);
  const hasRequest = true;
  const hasResponse = response !== undefined;
  const tabs = [
    ...(hasRequest ? (['request'] as const) : []),
    ...(hasResponse ? (['response'] as const) : []),
  ];
  const activeTab = tab === 'response' && hasResponse ? 'response' : tabs[0];

  return (
    <section
      className={referenceClassName(theme, styles.operationPreview, className)}
    >
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
          <PreviewPanel
            key="request"
            label="request"
            sections={requestSections(path, request)}
          />
        </div>
      ) : response !== undefined ? (
        <div
          className={styles.previewCode}
          role={tabs.length > 1 ? 'tabpanel' : undefined}
        >
          <PreviewPanel
            key="response"
            label="response"
            sections={[
              { label: 'Body', value: response, rawValue: responseValue },
            ]}
          />
        </div>
      ) : null}
    </section>
  );
}
