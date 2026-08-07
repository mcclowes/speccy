/**
 * ---
 * purpose: Renders recursive schema trees, per-field detail disclosure, and every declared media type's examples.
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
      ? 'enum'
      : [schema.type ?? 'object', schema.format].filter(Boolean).join(' · ');
  return [schema.title, type].filter(Boolean).join(' · ');
}

function alternativeName(schema: SchemaObject, index: number): string {
  if (!schema.title) return `Option ${index + 1}`;
  return schema.title
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ');
}

export function JsonValue({ value }: { value: unknown }) {
  if (value === undefined) return null;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return <CodeBlock className="sp-example" value={serialized} />;
}

function NamedMediaExamples({ examples }: { examples: NonNullable<MediaType['examples']> }) {
  const entries = Object.entries(examples);
  const [activeIndex, setActiveIndex] = useState(0);
  const [name, activeExample] = entries[activeIndex] ?? [];
  if (!activeExample) return null;

  const label = activeExample.summary ?? name;
  const title = entries.length > 1 ? (
    <><span>Example payload</span><select className="sp-example-select" aria-label="Example payload" value={activeIndex} onChange={(event) => setActiveIndex(Number(event.target.value))}>{entries.map(([exampleName, example], index) => <option value={index} key={exampleName}>{example.summary ?? exampleName}</option>)}</select></>
  ) : `Example payload: ${label}`;
  const value = activeExample.value ?? activeExample.externalValue;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

  return <div className="sp-named-example">
    <Markdown>{activeExample.description}</Markdown>
    <CodeBlock className="sp-example" title={title} value={serialized} />
  </div>;
}

export function SchemaView({ schema, name, required = false, depth = 0, collapseObjects = false, showExample = true, summaryOnly = false, exampleValue }: {
  schema?: SchemaObject;
  name?: string;
  required?: boolean;
  depth?: number;
  collapseObjects?: boolean;
  showExample?: boolean;
  summaryOnly?: boolean;
  exampleValue?: unknown;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(!name);
  if (!schema) return null;
  const properties = schema.properties ?? {};
  const alternatives = schema.oneOf ?? schema.anyOf;
  const isObject = schema.type === 'object' || Object.keys(properties).length > 0;
  const enumValues = schema.enum ?? (schema.type === 'array' ? schema.items?.enum : undefined);
  const constraints: Array<{ label: string; value: string | number }> = [];
  if (schema.minimum !== undefined) constraints.push({ label: 'min', value: schema.minimum });
  if (schema.maximum !== undefined) constraints.push({ label: 'max', value: schema.maximum });
  if (schema.minLength !== undefined) constraints.push({ label: 'min length', value: schema.minLength });
  if (schema.maxLength !== undefined) constraints.push({ label: 'max length', value: schema.maxLength });
  if (schema.pattern) constraints.push({ label: 'pattern', value: schema.pattern });
  const hasFieldDetails = Boolean(name && (
    schema.description
    || enumValues
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
        {required && <span className="sp-required" title="Required">*</span>}
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
  const headerClassName = `sp-schema-head${name ? ' sp-schema-head-named' : ''}${schema.deprecated ? ' sp-schema-head-deprecated' : ''}`;
  const header = name && hasFieldDetails
    ? <button
        type="button"
        className={headerClassName}
        aria-expanded={detailsOpen}
        aria-label={`${detailsOpen ? 'Hide' : 'Show'} details for ${name}`}
        onClick={toggleDetails}
      >{headerContents}</button>
    : <div className={headerClassName}>{headerContents}</div>;
  const fieldDetails = <div className={`sp-schema-field-details${name ? ' sp-schema-field-details-named' : ''}`}>
      <Markdown className="sp-schema-description">{schema.description}</Markdown>
      {enumValues && <p className="sp-schema-meta sp-schema-enum"><span>Enum:</span>{enumValues.map((value, index) => <code key={index}>{typeof value === 'string' ? value : JSON.stringify(value)}</code>)}</p>}
      {constraints.length > 0 && <p className="sp-schema-meta sp-schema-constraints">{constraints.map((constraint) => <span className="sp-schema-constraint" key={constraint.label}><span>{constraint.label}</span> <code>{constraint.value}</code></span>)}</p>}
      {schema.default !== undefined && <p className="sp-schema-meta">Default: <code>{JSON.stringify(schema.default)}</code></p>}
      {name && exampleValue !== undefined && (exampleValue === null || typeof exampleValue !== 'object') && <p className="sp-schema-meta sp-schema-example"><span>Example</span><code>{typeof exampleValue === 'string' ? exampleValue : JSON.stringify(exampleValue)}</code></p>}
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
      {alternatives && <div className="sp-schema-alternatives">
        {alternatives.length > 1 && <div className="sp-schema-alternatives-label">Accepted shapes</div>}
        <div className="sp-schema-properties">{alternatives.map((alternative, index) => (
          <SchemaView
            key={index}
            name={alternatives.length > 1 ? alternativeName(alternative, index) : undefined}
            schema={alternative}
            depth={depth + 1}
            collapseObjects={collapseObjects}
            showExample={showExample}
          />
        ))}</div>
      </div>}
  </>;
  const className = `sp-schema sp-schema-depth-${Math.min(depth, 3)}`;

  if (collapseObjects && isObject) {
    if (name) {
      return <div className={`${className} sp-schema-object-shell`}>
        <div className="sp-schema-field-card">
          <details
            className="sp-schema-object sp-schema-object-named"
            open={structureOpen}
          >
            <summary onClick={(event) => {
              event.preventDefault();
              setStructureOpen((open) => !open);
            }}>{header}</summary>
          </details>
          {detailsOpen && fieldDetails}
        </div>
        <div hidden={!structureOpen}>{structuralBody}</div>
      </div>;
    }

    return <>
      <details className={`${className} sp-schema-object`} open>
        <summary>{header}</summary>
        {fieldDetails}
        {structuralBody}
      </details>
    </>;
  }

  return (
    <div className={className}>
      {name ? <div className="sp-schema-field-card">
        {header}
        {detailsOpen && fieldDetails}
      </div> : <>
        {header}
        {fieldDetails}
      </>}
      {!summaryOnly && structuralBody}
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
      {showExamples && media.examples && <NamedMediaExamples examples={media.examples} />}
    </section>
  ))}</div>;
}
