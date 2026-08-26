/**
 * ---
 * purpose: Presents shared parameter, request body, and response content across endpoint, callback, and reference layouts.
 * related:
 *   - ./DesignSystem.tsx - Supplies required markers and other visual primitives.
 *   - ./SchemaView.tsx - Renders schemas and media examples within each resource.
 * ---
 */

import type {
  HeaderObject,
  Parameter,
  RequestBody,
  ResponseObject,
  Schema,
  SchemaObject,
} from 'speccy-core';
import type { ReactNode } from 'react';
import { RequiredMark } from './DesignSystem';
import { Markdown } from './Markdown';
import { SchemaExplorer } from './SchemaExplorer';
import { JsonValue, MediaContent, SchemaView } from './SchemaView';

export type ResourceDensity = 'compact' | 'comfortable';

/** A parameter or header describes its value with either a schema or a content map. */
export function resourceSchema(
  resource: Pick<Parameter, 'schema' | 'content'>,
): Schema | undefined {
  if (resource.schema) return resource.schema;
  return Object.values(resource.content ?? {})[0]?.schema;
}

/**
 * Flattens a header onto the schema the explorer renders it as, so its description,
 * deprecation, and example survive whether it was declared with a schema or with content.
 */
export function headerFieldSchema(header: HeaderObject): SchemaObject {
  const schema = resourceSchema(header);
  return {
    ...(typeof schema === 'object' ? schema : {}),
    description: header.description,
    ...(header.deprecated ? { deprecated: true } : {}),
    ...(header.example !== undefined ? { example: header.example } : {}),
  };
}

/** OpenAPI serialization is part of the contract, so the non-default choices are stated. */
export function SerializationNote({
  parameter,
}: {
  parameter: Pick<
    Parameter,
    'style' | 'explode' | 'allowEmptyValue' | 'allowReserved'
  >;
}) {
  const notes = [
    parameter.style && `style ${parameter.style}`,
    parameter.explode !== undefined && `explode ${parameter.explode}`,
    parameter.allowEmptyValue && 'empty values allowed',
    parameter.allowReserved && 'reserved characters allowed',
  ].filter(Boolean);
  if (notes.length === 0) return null;
  return <p className="sp-resource-serialization">{notes.join(' · ')}</p>;
}

export function NamedExamples({
  examples,
}: {
  examples: NonNullable<Parameter['examples']>;
}) {
  return (
    <div className="sp-resource-examples">
      {Object.entries(examples).map(([name, example]) => (
        <div key={name}>
          <strong>{example.summary ?? name}</strong>
          <Markdown>{example.description}</Markdown>
          {example.externalValue ? (
            <a href={example.externalValue}>{example.externalValue}</a>
          ) : (
            <JsonValue value={example.value} />
          )}
        </div>
      ))}
    </div>
  );
}

export function ParameterDetails({
  parameter,
  fallbackName = 'unnamed',
  density = 'comfortable',
  summaryOnly = false,
}: {
  parameter: Parameter;
  fallbackName?: string;
  density?: ResourceDensity;
  summaryOnly?: boolean;
}) {
  const schema = resourceSchema(parameter);
  const example =
    parameter.example !== undefined
      ? parameter.example
      : typeof schema === 'object'
        ? schema.example
        : undefined;
  const mediaType = parameter.schema
    ? undefined
    : Object.keys(parameter.content ?? {})[0];
  const detailed = !summaryOnly;
  return (
    <div className={`sp-resource-details sp-parameter-details is-${density}`}>
      <div className="sp-resource-heading">
        <code>{parameter.name ?? fallbackName}</code>
        <span className="sp-resource-meta">{parameter.in ?? 'query'}</span>
        {parameter.required && <RequiredMark />}
        {parameter.deprecated && (
          <span className="sp-deprecated">deprecated</span>
        )}
      </div>
      <Markdown>{parameter.description}</Markdown>
      {mediaType && <div className="sp-media-type">{mediaType}</div>}
      <SchemaView
        schema={schema}
        showExample={detailed}
        summaryOnly={summaryOnly}
      />
      {detailed && <SerializationNote parameter={parameter} />}
      {example !== undefined && <JsonValue value={example} />}
      {detailed && parameter.examples && (
        <NamedExamples examples={parameter.examples} />
      )}
    </div>
  );
}

export function RequestBodyDetails({
  body,
  density = 'comfortable',
  collapseObjects = false,
  showExamples = true,
  exampleValue,
  title,
}: {
  body: RequestBody;
  density?: ResourceDensity;
  collapseObjects?: boolean;
  showExamples?: boolean;
  exampleValue?: unknown;
  title?: ReactNode;
}) {
  return (
    <div
      className={`sp-resource-details sp-request-body-details is-${density}`}
    >
      <Markdown>{body.description}</Markdown>
      <MediaContent
        content={body.content}
        title={
          title && (
            <>
              {title}
              {body.required && <RequiredMark />}
            </>
          )
        }
        collapseObjects={collapseObjects}
        showExamples={showExamples}
        exampleValue={exampleValue}
      />
    </div>
  );
}

export function ResponseDetails({
  response,
  density = 'comfortable',
  collapseObjects = false,
  showExamples = true,
  showRootDescription = true,
  exampleValue,
}: {
  response: ResponseObject;
  density?: ResourceDensity;
  collapseObjects?: boolean;
  showExamples?: boolean;
  showRootDescription?: boolean;
  exampleValue?: unknown;
}) {
  return (
    <div className={`sp-resource-details sp-response-details is-${density}`}>
      <Markdown>{response.description}</Markdown>
      {response.headers && (
        <div className="sp-detail-list">
          <strong>Headers</strong>
          <SchemaExplorer
            schema={{
              type: 'object',
              properties: Object.fromEntries(
                Object.entries(response.headers).map(([name, header]) => [
                  name,
                  headerFieldSchema(header),
                ]),
              ),
              required: Object.entries(response.headers)
                .filter(([, header]) => header.required)
                .map(([name]) => name),
            }}
            showExample
            showHeader={false}
          />
        </div>
      )}
      <MediaContent
        content={response.content}
        title="Body"
        collapseObjects={collapseObjects}
        showExamples={showExamples}
        showRootDescription={showRootDescription}
        exampleValue={exampleValue}
      />
    </div>
  );
}
