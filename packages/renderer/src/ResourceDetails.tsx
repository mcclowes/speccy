/**
 * ---
 * purpose: Presents shared parameter, request body, and response content across endpoint, callback, and reference layouts.
 * related:
 *   - ./DesignSystem.tsx - Supplies required markers and other visual primitives.
 *   - ./SchemaView.tsx - Renders schemas and media examples within each resource.
 * ---
 */

import type { Parameter, RequestBody, ResponseObject } from 'speccy-core';
import { RequiredMark } from './DesignSystem';
import { Markdown } from './Markdown';
import { JsonValue, MediaContent, SchemaView } from './SchemaView';

export type ResourceDensity = 'compact' | 'comfortable';

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
  const example =
    parameter.example !== undefined
      ? parameter.example
      : parameter.schema?.example;
  return (
    <div className={`sp-resource-details sp-parameter-details is-${density}`}>
      <div className="sp-resource-heading">
        <code>{parameter.name ?? fallbackName}</code>
        <span className="sp-resource-meta">{parameter.in ?? 'query'}</span>
        {parameter.required && <RequiredMark />}
      </div>
      <Markdown>{parameter.description}</Markdown>
      <SchemaView
        schema={parameter.schema}
        showExample={!summaryOnly}
        summaryOnly={summaryOnly}
      />
      {example !== undefined && <JsonValue value={example} />}
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
  title?: string;
}) {
  return (
    <div
      className={`sp-resource-details sp-request-body-details is-${density}`}
    >
      {title && (
        <div className="sp-resource-title">
          {title}
          {body.required && <RequiredMark />}
        </div>
      )}
      <Markdown>{body.description}</Markdown>
      <MediaContent
        content={body.content}
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
          <SchemaView
            schema={{
              type: 'object',
              properties: Object.fromEntries(
                Object.entries(response.headers).map(([name, header]) => [
                  name,
                  { ...header.schema, description: header.description },
                ]),
              ),
              required: Object.entries(response.headers)
                .filter(([, header]) => header.required)
                .map(([name]) => name),
            }}
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
      {response.links && (
        <div className="sp-detail-list">
          <strong>Links</strong>
          {Object.entries(response.links).map(([name, link]) => (
            <div key={name}>
              <code>{name}</code>
              <Markdown>{link.description}</Markdown>
              <span>{link.operationId ?? link.operationRef}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
