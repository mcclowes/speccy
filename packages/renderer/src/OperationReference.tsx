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

import { useState, type MouseEventHandler, type ReactNode } from 'react';
import type { OpenAPIDocument } from 'speccy-core';
import {
  CodeLines,
  CollapsibleJson,
  CopyButton,
  TruncatedCode,
} from './CodeBlock';
import { ApiPath, DisclosureChevron, MethodBadge } from './DesignSystem';
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
  type OperationReferenceCatalogEntry,
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

function ReferenceAnchor({
  theme,
  style,
  className,
  href,
  onClick,
  children,
}: {
  theme: Theme;
  style?: string;
  className?: string;
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
}) {
  return (
    <a
      className={referenceClassName(theme, style, className)}
      href={href}
      onClick={onClick}
    >
      {children}
    </a>
  );
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
    <ReferenceAnchor
      theme={theme}
      style={styles.inlineLink}
      className={className}
      href={href}
      onClick={onClick}
    >
      <MethodBadge method={method} compact />
      <ApiPath value={path} wrap />
    </ReferenceAnchor>
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
    <ReferenceAnchor
      theme={theme}
      style={styles.endpointStrip}
      className={className}
      href={href}
      onClick={onClick}
    >
      <EndpointIdentity method={method} path={path} />
      <span className={styles.action}>
        Open reference <span aria-hidden="true">→</span>
      </span>
    </ReferenceAnchor>
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
    <ReferenceAnchor
      theme={theme}
      style={styles.referenceCard}
      className={className}
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
    </ReferenceAnchor>
  );
}

export type OperationPreviewProps = OperationReferenceProps & {
  /** Overrides derived path, query, header, or body values by section. */
  requestValues?: OperationPreviewRequestValues;
  /** Overrides the request body derived from `spec`. Objects are formatted as JSON. */
  requestExample?: unknown;
  /** Overrides the response example derived from `spec`. Objects are formatted as JSON. */
  responseExample?: unknown;
  /**
   * Sets the initial collapsed state for request and response sections. Query
   * parameters and headers are collapsed by default; all other sections are open.
   */
  defaultCollapsed?: Partial<Record<OperationPreviewSection, boolean>>;
};

/** Individual sections that can be collapsed in an operation preview. */
export type OperationPreviewSection = 'path' | 'query' | 'headers' | 'body';

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
  key: OperationPreviewSection;
  label: string;
  value: string;
  rawValue?: unknown;
}

function PreviewSection({
  id,
  label,
  value,
  rawValue,
  collapsed,
  onToggle,
}: PreviewSectionData & {
  id: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <section className={styles.previewSection}>
      <header>
        <button
          type="button"
          className={styles.previewSectionToggle}
          aria-expanded={!collapsed}
          aria-controls={id}
          onClick={onToggle}
        >
          <DisclosureChevron />
          {label}
        </button>
        <CopyButton
          value={value}
          label={`Copy ${label.toLowerCase()}`}
          compact
        />
      </header>
      <pre id={id} hidden={collapsed}>
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
  defaultCollapsed,
}: {
  label: string;
  sections: PreviewSectionData[];
  defaultCollapsed?: Partial<Record<OperationPreviewSection, boolean>>;
}) {
  const [collapsed, setCollapsed] = useState(
    () =>
      new Set(
        sections
          .filter(
            (section) =>
              defaultCollapsed?.[section.key] ??
              (section.key === 'query' || section.key === 'headers'),
          )
          .map((section) => section.key),
      ),
  );
  const lines = sections.reduce(
    (total, section) =>
      total +
      PREVIEW_SECTION_HEADER_LINES +
      (collapsed.has(section.key) ? 0 : section.value.split('\n').length),
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
        {sections.map((section, index) => (
          <PreviewSection
            {...section}
            id={`${label}-${section.key}-${index}`}
            collapsed={collapsed.has(section.key)}
            onToggle={() =>
              setCollapsed((current) => {
                const next = new Set(current);
                if (next.has(section.key)) next.delete(section.key);
                else next.add(section.key);
                return next;
              })
            }
            key={section.key}
          />
        ))}
      </TruncatedCode>
    </div>
  );
}

/** Request sections that are shown only when the operation supplies values for them. */
const OPTIONAL_REQUEST_SECTIONS = [
  { key: 'query', label: 'Query parameters' },
  { key: 'headers', label: 'Headers' },
] as const;

function requestSections(
  path: string,
  values: OperationPreviewRequestValues,
): PreviewSectionData[] {
  return [
    {
      key: 'path',
      label: 'Path',
      value: requestPath(path, values.path ?? {}),
    },
    ...OPTIONAL_REQUEST_SECTIONS.filter((section) =>
      hasValues(values[section.key]),
    ).map((section) => ({
      key: section.key,
      label: section.label,
      value: formatExample(values[section.key])!,
      rawValue: values[section.key],
    })),
    ...('body' in values
      ? [
          {
            key: 'body' as const,
            label: 'Body',
            value: formatExample(values.body)!,
            rawValue: values.body,
          },
        ]
      : []),
  ];
}

type PreviewTab = 'request' | 'response';

interface PreviewPanelData {
  key: PreviewTab;
  title: string;
  sections: PreviewSectionData[];
}

/** A request panel is always available; the response panel appears only when there is an example. */
function previewPanels(
  path: string,
  request: OperationPreviewRequestValues,
  responseValue: unknown,
  response: string | undefined,
): PreviewPanelData[] {
  return [
    {
      key: 'request',
      title: 'Request',
      sections: requestSections(path, request),
    },
    ...(response === undefined
      ? []
      : [
          {
            key: 'response' as const,
            title: 'Response',
            sections: [
              {
                key: 'body' as const,
                label: 'Body',
                value: response,
                rawValue: responseValue,
              },
            ],
          },
        ]),
  ];
}

function PreviewTabs({
  panels,
  active,
  onSelect,
}: {
  panels: PreviewPanelData[];
  active: PreviewTab;
  onSelect: (tab: PreviewTab) => void;
}) {
  return (
    <div className={styles.previewTabs} role="tablist" aria-label="Example">
      {panels.map((panel) => (
        <button
          type="button"
          role="tab"
          aria-selected={active === panel.key}
          onClick={() => onSelect(panel.key)}
          key={panel.key}
        >
          {panel.title}
        </button>
      ))}
    </div>
  );
}

export function OperationPreview({
  requestValues,
  requestExample,
  responseExample,
  defaultCollapsed,
  theme = 'inherit',
  className,
  onClick,
  ...lookup
}: OperationPreviewProps) {
  const [tab, setTab] = useState<PreviewTab>('request');
  const { method, path, href, operation, preview } =
    useOperationReference(lookup);
  const derived =
    preview ??
    deriveOperationPreviewDataFromOperation(
      operation?.pathItem,
      operation?.operation,
    );
  const request = mergeOperationPreviewRequestValues(
    derived.request,
    requestValues,
  );
  if (requestExample !== undefined) request.body = requestExample;
  const responseValue = responseExample ?? derived.response;
  const panels = previewPanels(
    path,
    request,
    responseValue,
    formatExample(responseValue),
  );
  const active = panels.find((panel) => panel.key === tab) ?? panels[0]!;
  const tabbed = panels.length > 1;

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
      {tabbed && (
        <PreviewTabs panels={panels} active={active.key} onSelect={setTab} />
      )}
      <div
        className={styles.previewCode}
        role={tabbed ? 'tabpanel' : undefined}
      >
        <PreviewPanel
          key={active.key}
          label={active.key}
          sections={active.sections}
          defaultCollapsed={defaultCollapsed}
        />
      </div>
    </section>
  );
}
