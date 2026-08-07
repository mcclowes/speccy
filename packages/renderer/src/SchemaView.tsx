/**
 * ---
 * purpose: Renders schemas, examples, and every declared media type without operation-level state.
 * related:
 *   - ./Speccy.tsx - Uses these primitives for parameters, requests, and responses.
 *   - ./ReferenceSections.tsx - Uses them for reusable component catalogues.
 * ---
 */

import { useState } from 'react';
import { CodeBlock } from './CodeBlock';
import { Markdown } from './Markdown';
import type { MediaType, SchemaObject } from './types';

function schemaLabel(schema?: SchemaObject): string {
  if (!schema) return 'any';
  if (schema.$ref) return schema.$ref.split('/').pop() ?? 'reference';
  const type = schema.type === 'array'
    ? `array<${schemaLabel(schema.items)}>`
    : schema.enum
      ? schema.enum.map(String).join(' | ')
      : [schema.type ?? 'object', schema.format].filter(Boolean).join(' · ');
  return [schema.title, type].filter(Boolean).join(' · ');
}

export function JsonValue({ value }: { value: unknown }) {
  if (value === undefined) return null;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return <CodeBlock className="sp-example" value={serialized} />;
}

export function SchemaView({ schema, name, required = false, depth = 0, collapseObjects = false, showExample = true, exampleValue }: {
  schema?: SchemaObject;
  name?: string;
  required?: boolean;
  depth?: number;
  collapseObjects?: boolean;
  showExample?: boolean;
  exampleValue?: unknown;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  if (!schema) return null;
  const properties = schema.properties ?? {};
  const alternatives = schema.oneOf ?? schema.anyOf;
  const alternativeLabel = schema.oneOf ? 'one of' : 'any of';
  const isObject = schema.type === 'object' || Object.keys(properties).length > 0;
  const constraints = [
    schema.minimum !== undefined && `min ${schema.minimum}`,
    schema.maximum !== undefined && `max ${schema.maximum}`,
    schema.minLength !== undefined && `min length ${schema.minLength}`,
    schema.maxLength !== undefined && `max length ${schema.maxLength}`,
    schema.pattern && `pattern ${schema.pattern}`,
  ].filter(Boolean);
  const hasFieldDetails = Boolean(name && (
    schema.description
    || constraints.length > 0
    || schema.default !== undefined
    || (exampleValue !== undefined && (exampleValue === null || typeof exampleValue !== 'object'))
    || (exampleValue === undefined && showExample && schema.example !== undefined)
  ));

  const toggleDetails = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDetailsOpen((open) => !open);
  };

  const headerContents = <>
        {name && <code className="sp-property">{name}</code>}
        {required && <span className="sp-required">required</span>}
        <span className="sp-type">{schemaLabel(schema)}</span>
        {schema.nullable && <span className="sp-qualifier">nullable</span>}
        {schema.readOnly && <span className="sp-qualifier">read only</span>}
        {schema.writeOnly && <span className="sp-qualifier">write only</span>}
        {schema.deprecated && <span className="sp-deprecated">deprecated</span>}
        {hasFieldDetails && <span
          className="sp-schema-details-toggle"
          data-tooltip={detailsOpen ? 'Hide field details' : 'Show field details'}
          aria-hidden="true"
        ><span /></span>}
  </>;
  const header = name && hasFieldDetails
    ? <button
        type="button"
        className="sp-schema-head sp-schema-head-named"
        aria-expanded={detailsOpen}
        aria-label={`${detailsOpen ? 'Hide' : 'Show'} details for ${name}`}
        onClick={toggleDetails}
      >{headerContents}</button>
    : <div className={`sp-schema-head${name ? ' sp-schema-head-named' : ''}`}>{headerContents}</div>;
  const fieldDetails = <div className={`sp-schema-field-details${name ? ' sp-schema-field-details-named' : ''}`}>
      <Markdown className="sp-schema-description">{schema.description}</Markdown>
      {constraints.length > 0 && <p className="sp-schema-meta">{constraints.join(' · ')}</p>}
      {schema.default !== undefined && <p className="sp-schema-meta">Default: <code>{JSON.stringify(schema.default)}</code></p>}
      {name && exampleValue !== undefined && (exampleValue === null || typeof exampleValue !== 'object') && <p className="sp-schema-meta">Example: <code>{typeof exampleValue === 'string' ? exampleValue : JSON.stringify(exampleValue)}</code></p>}
      {exampleValue === undefined && showExample && schema.example !== undefined && <><div className="sp-schema-meta">Example</div><JsonValue value={schema.example} /></>}
  </div>;
  const structuralBody = <>
      {Object.entries(properties).length > 0 && <div className="sp-schema-properties">{Object.entries(properties).map(([propertyName, property]) => (
        <SchemaView key={propertyName} name={propertyName} schema={property} required={schema.required?.includes(propertyName)} depth={depth + 1} collapseObjects={collapseObjects} showExample={showExample} exampleValue={exampleValue && typeof exampleValue === 'object' && !Array.isArray(exampleValue) ? (exampleValue as Record<string, unknown>)[propertyName] : undefined} />
      ))}</div>}
      {schema.items && depth < 6 && <SchemaView name="items" schema={schema.items} depth={depth + 1} collapseObjects={collapseObjects} showExample={showExample} exampleValue={Array.isArray(exampleValue) ? exampleValue[0] : undefined} />}
      {typeof schema.additionalProperties === 'object' && <SchemaView name="additional property" schema={schema.additionalProperties} depth={depth + 1} collapseObjects={collapseObjects} showExample={showExample} />}
      {schema.allOf && <div className="sp-schema-properties">{schema.allOf.map((member, index) => (
        <SchemaView key={index} schema={member} depth={depth + 1} collapseObjects={collapseObjects} showExample={showExample} />
      ))}</div>}
      {alternatives && <div className="sp-schema-properties">{alternatives.map((alternative, index) => (
        <SchemaView
          key={index}
          name={alternatives.length > 1 ? `${alternativeLabel} ${index + 1}` : undefined}
          schema={alternative}
          depth={depth + 1}
          collapseObjects={collapseObjects}
          showExample={showExample}
        />
      ))}</div>}
  </>;
  const className = `sp-schema sp-schema-depth-${Math.min(depth, 3)}`;

  if (collapseObjects && isObject) {
    return <>
      <details className={`${className} sp-schema-object${name ? ' sp-schema-object-named' : ''}`} open={!name}>
        <summary>{header}</summary>
        {!name && fieldDetails}
        {structuralBody}
      </details>
      {name && detailsOpen && fieldDetails}
    </>;
  }

  return (
    <div className={className}>
      {header}
      {(!name || detailsOpen) && fieldDetails}
      {structuralBody}
    </div>
  );
}

export function MediaContent({ content, collapseObjects = false, showExamples = true, exampleValue }: {
  content?: Record<string, MediaType>;
  collapseObjects?: boolean;
  showExamples?: boolean;
  exampleValue?: unknown;
}) {
  if (!content || Object.keys(content).length === 0) return null;
  return <div className="sp-media-list">{Object.entries(content).map(([mediaType, media]) => (
    <section className="sp-media" key={mediaType}>
      <div className="sp-media-type">{mediaType}</div>
      <SchemaView schema={media.schema} collapseObjects={collapseObjects} showExample={showExamples} exampleValue={exampleValue} />
      {showExamples && media.example !== undefined && <JsonValue value={media.example} />}
      {showExamples && media.examples && Object.entries(media.examples).map(([name, example]) => (
        <div className="sp-named-example" key={name}><strong>Example payload: {example.summary ?? name}</strong><Markdown>{example.description}</Markdown><JsonValue value={example.value ?? example.externalValue} /></div>
      ))}
    </section>
  ))}</div>;
}
