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
import {
  parseSpec,
  resolveRefs,
  type MediaType,
  type OpenAPIDocument,
  type Operation,
  type Parameter,
  type Schema,
} from 'speccy-core';
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
  /** OpenAPI document used to derive examples when explicit examples are omitted. */
  spec?: OpenAPIDocument | string;
  /** Overrides the request example derived from `spec`. */
  requestExample?: string;
  /** Overrides the response example derived from `spec`. */
  responseExample?: string;
}

function schemaExample(schema: Schema | undefined): unknown {
  if (schema === undefined) return undefined;
  if (typeof schema === 'boolean') return schema ? {} : undefined;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.oneOf?.[0]) return schemaExample(schema.oneOf[0]);
  if (schema.anyOf?.[0]) return schemaExample(schema.anyOf[0]);
  if (schema.allOf?.length) {
    return Object.assign(
      {},
      ...schema.allOf
        .map(schemaExample)
        .filter((value) => value && typeof value === 'object'),
    );
  }
  if (schema.type === 'array' || schema.items)
    return schema.items ? [schemaExample(schema.items)] : [];
  if (schema.type === 'object' || schema.properties)
    return Object.fromEntries(
      Object.entries(schema.properties ?? {})
        .filter(([, property]) => {
          const value = typeof property === 'boolean' ? undefined : property;
          return !value?.readOnly;
        })
        .map(([name, property]) => [name, schemaExample(property)]),
    );
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return true;
  if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
  if (schema.format === 'date') return '2024-01-01';
  if (schema.format === 'uuid') return '00000000-0000-4000-8000-000000000000';
  return 'string';
}

function mediaExample(media: MediaType | undefined): unknown {
  if (!media) return undefined;
  if (media.example !== undefined) return media.example;
  for (const example of Object.values(media.examples ?? {})) {
    if (example.value !== undefined) return example.value;
    if (example.externalValue !== undefined) return example.externalValue;
  }
  return schemaExample(media.schema);
}

function parameterExample(parameter: Parameter): unknown {
  return parameter.example ?? schemaExample(parameter.schema);
}

function formatExample(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function derivedExamples(
  spec: OpenAPIDocument | string | undefined,
  method: string,
  path: string,
): { request?: string; response?: string } {
  if (!spec) return {};
  const document = resolveRefs(parseSpec(spec));
  const pathItem = document.paths?.[path];
  const operation = pathItem?.[
    method.toLowerCase() as keyof typeof pathItem
  ] as Operation | undefined;
  if (!operation || typeof operation !== 'object') return {};

  const parameters = [
    ...(pathItem?.parameters ?? []),
    ...(operation.parameters ?? []),
  ];
  const requestParts: Record<string, unknown> = {};
  for (const location of ['path', 'query', 'header'] as const) {
    const values = Object.fromEntries(
      parameters
        .filter((parameter) => parameter.in === location)
        .map((parameter) => [
          parameter.name ?? 'unnamed',
          parameterExample(parameter),
        ]),
    );
    if (Object.keys(values).length)
      requestParts[
        location === 'header' ? 'headers' : `${location}Parameters`
      ] = values;
  }
  const requestMedia = Object.values(operation.requestBody?.content ?? {})[0];
  const body = mediaExample(requestMedia);
  if (body !== undefined) requestParts.body = body;
  const requestValue =
    Object.keys(requestParts).length === 1 && 'body' in requestParts
      ? requestParts.body
      : Object.keys(requestParts).length
        ? requestParts
        : undefined;

  const response =
    Object.entries(operation.responses ?? {}).find(([code]) =>
      code.startsWith('2'),
    )?.[1] ?? Object.values(operation.responses ?? {})[0];
  const responseMedia = Object.values(response?.content ?? {})[0];
  return {
    request: formatExample(requestValue),
    response: formatExample(mediaExample(responseMedia)),
  };
}

export function OperationPreview({
  method,
  path,
  href,
  spec,
  requestExample,
  responseExample,
  className,
  onClick,
}: OperationPreviewProps) {
  const [tab, setTab] = useState<'request' | 'response'>('request');
  const derived = derivedExamples(spec, method, path);
  const request = requestExample ?? derived.request;
  const response = responseExample ?? derived.response;
  const hasRequest = request !== undefined;
  const hasResponse = response !== undefined;
  const tabs = [
    ...(hasRequest ? (['request'] as const) : []),
    ...(hasResponse ? (['response'] as const) : []),
  ];
  const activeTab = tab === 'response' && hasResponse ? 'response' : tabs[0];
  const value = activeTab === 'response' ? response : request;

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
      {value !== undefined && (
        <div
          className={styles.previewCode}
          role={tabs.length > 1 ? 'tabpanel' : undefined}
        >
          <CodeBlock
            value={value}
            copyPlacement="body"
            copyLabel={`Copy ${activeTab}`}
            truncateLabel={activeTab}
          />
        </div>
      )}
    </section>
  );
}
