/**
 * ---
 * purpose: Renders recursive schema trees, per-field detail disclosure, and every declared media type's examples.
 * related:
 *   - ./schemaViewModel.ts - Derives constraints, applicators, and example facts for each schema.
 *   - ./Speccy.tsx - Uses these primitives for parameters, requests, and responses.
 *   - ./ReferenceSections.tsx - Uses them for reusable component catalogues.
 * ---
 */

import { type MouseEvent, type ReactNode, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import { DisclosureContent } from './DesignSystem';
import { ExampleSelect } from './ExampleSelect';
import { Markdown } from './Markdown';
import { SchemaExplorer } from './SchemaExplorer';
import { schemaLabel } from './schemaExplorerModel';
import {
  alternativeName,
  explorableSchema,
  schemaViewModel,
  type SchemaViewModel,
} from './schemaViewModel';
import type { MediaType, Schema, SchemaObject } from 'speccy-core';

export function JsonValue({ value }: { value: unknown }) {
  if (value === undefined) return null;
  const serialized =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return <CodeBlock className="sp-example" value={serialized} />;
}

function NamedMediaExamples({
  examples,
}: {
  examples: NonNullable<MediaType['examples']>;
}) {
  const entries = Object.entries(examples);
  const [activeIndex, setActiveIndex] = useState(0);
  const [name, activeExample] = entries[activeIndex] ?? [];
  if (!activeExample) return null;

  const label = activeExample.summary ?? name;
  const title =
    entries.length > 1 ? (
      <>
        <span>Example payload</span>
        <ExampleSelect
          label="Example payload"
          value={activeIndex}
          onChange={setActiveIndex}
          options={entries.map(([exampleName, example]) => ({
            key: exampleName,
            label: example.summary ?? exampleName,
          }))}
        />
      </>
    ) : (
      `Example payload: ${label}`
    );
  const value = activeExample.value ?? activeExample.externalValue;
  const serialized =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);

  return (
    <div className="sp-named-example">
      <Markdown>{activeExample.description}</Markdown>
      <CodeBlock className="sp-example" title={title} value={serialized} />
    </div>
  );
}

interface SchemaViewProps {
  schema?: Schema;
  name?: string;
  required?: boolean;
  depth?: number;
  collapseObjects?: boolean;
  showExample?: boolean;
  showRootDescription?: boolean;
  summaryOnly?: boolean;
  exampleValue?: unknown;
}

interface ResolvedSchemaViewProps {
  schema: SchemaObject;
  required: boolean;
  depth: number;
  collapseObjects: boolean;
  showExample: boolean;
  summaryOnly: boolean;
  exampleValue: unknown;
}

export function SchemaView({
  schema,
  name,
  required = false,
  depth = 0,
  collapseObjects = false,
  showExample = true,
  showRootDescription = true,
  summaryOnly = false,
  exampleValue,
}: SchemaViewProps) {
  if (schema === undefined) return null;
  if (typeof schema === 'boolean') {
    return (
      <p className="sp-schema-boolean">
        {schema ? 'Any value is allowed.' : 'No value is allowed.'}
      </p>
    );
  }
  const resolved: ResolvedSchemaViewProps = {
    schema,
    required,
    depth,
    collapseObjects,
    showExample,
    summaryOnly,
    exampleValue,
  };
  if (name) return <FieldSchemaView {...resolved} name={name} />;
  return (
    <RootSchemaView {...resolved} showRootDescription={showRootDescription} />
  );
}

function schemaClassName(depth: number): string {
  return `sp-schema sp-schema-depth-${Math.min(depth, 3)}`;
}

function schemaHeadClassName(schema: SchemaObject, named: boolean): string {
  return `sp-schema-head${named ? ' sp-schema-head-named' : ''}${schema.deprecated ? ' sp-schema-head-deprecated' : ''}`;
}

function SchemaHeadContents({
  schema,
  name,
  required,
}: {
  schema: SchemaObject;
  name?: string;
  required: boolean;
}) {
  return (
    <>
      {name && <code className="sp-property">{name}</code>}
      {required && (
        <span className="sp-required" title="Required">
          *
        </span>
      )}
      <span className="sp-type">{schemaLabel(schema)}</span>
      {schema.nullable && <span className="sp-qualifier">nullable</span>}
      {schema.readOnly && <span className="sp-qualifier">read only</span>}
      {schema.writeOnly && <span className="sp-qualifier">write only</span>}
      {schema.deprecated && <span className="sp-deprecated">deprecated</span>}
    </>
  );
}

function SchemaFieldDetails({
  schema,
  model,
  exampleValue,
  named,
  showScalarExample,
}: {
  schema: SchemaObject;
  model: SchemaViewModel;
  exampleValue: unknown;
  named: boolean;
  showScalarExample: boolean;
}) {
  return (
    <div
      className={`sp-schema-field-details${named ? ' sp-schema-field-details-named' : ''}`}
    >
      <Markdown className="sp-schema-description">
        {schema.description}
      </Markdown>
      {schema.externalDocs?.url && (
        <p>
          <a href={schema.externalDocs.url}>
            {schema.externalDocs.description ?? 'External documentation'}
          </a>
        </p>
      )}
      {schema.xml && (
        <p className="sp-schema-meta">
          XML name: {schema.xml.name ?? 'default'}
          {schema.xml.namespace && `; namespace: ${schema.xml.namespace}`}
          {schema.xml.prefix && `; prefix: ${schema.xml.prefix}`}
          {schema.xml.attribute && '; attribute'}
          {schema.xml.wrapped && '; wrapped'}
        </p>
      )}
      {model.enumValues && (
        <p className="sp-schema-meta sp-schema-enum">
          <span>Enum:</span>
          {model.enumValues.map((value, index) => (
            <code key={index}>
              {typeof value === 'string' ? value : JSON.stringify(value)}
            </code>
          ))}
        </p>
      )}
      {model.constraints.length > 0 && (
        <p className="sp-schema-meta sp-schema-constraints">
          {model.constraints.map((constraint) => (
            <span className="sp-schema-constraint" key={constraint.label}>
              <span>{constraint.label}</span>{' '}
              <code>
                {typeof constraint.value === 'string' &&
                constraint.label !== 'const'
                  ? constraint.value
                  : JSON.stringify(constraint.value)}
              </code>
            </span>
          ))}
        </p>
      )}
      {schema.default !== undefined && (
        <p className="sp-schema-meta">
          Default: <code>{JSON.stringify(schema.default)}</code>
        </p>
      )}
      {schema.examples && (
        <div className="sp-schema-meta">
          <span>Examples</span>
          <JsonValue value={schema.examples} />
        </div>
      )}
      {showScalarExample && model.scalarExample && (
        <p className="sp-schema-meta sp-schema-example">
          <span>Example</span>
          <code>
            {typeof exampleValue === 'string'
              ? exampleValue
              : JSON.stringify(exampleValue)}
          </code>
        </p>
      )}
      {model.inlineExample && (
        <>
          <div className="sp-schema-meta">Example</div>
          <JsonValue value={schema.example} />
        </>
      )}
    </div>
  );
}

function SchemaStructure({
  schema,
  model,
  depth,
  collapseObjects,
  showExample,
  exampleValue,
}: {
  schema: SchemaObject;
  model: SchemaViewModel;
  depth: number;
  collapseObjects: boolean;
  showExample: boolean;
  exampleValue: unknown;
}) {
  const { properties, alternatives, discriminator, applicators } = model;
  const childProps = { depth: depth + 1, collapseObjects, showExample };
  const exampleFields =
    exampleValue &&
    typeof exampleValue === 'object' &&
    !Array.isArray(exampleValue)
      ? (exampleValue as Record<string, unknown>)
      : undefined;
  return (
    <>
      {Object.entries(properties).length > 0 && (
        <div className="sp-schema-properties">
          {Object.entries(properties).map(([propertyName, property]) => (
            <SchemaView
              key={propertyName}
              name={propertyName}
              schema={property}
              required={schema.required?.includes(propertyName)}
              exampleValue={exampleFields?.[propertyName]}
              {...childProps}
            />
          ))}
        </div>
      )}
      {schema.items && depth < 6 && (
        <SchemaView
          name="items"
          schema={schema.items}
          exampleValue={
            Array.isArray(exampleValue) ? exampleValue[0] : undefined
          }
          {...childProps}
        />
      )}
      {typeof schema.additionalProperties === 'object' && (
        <SchemaView
          name="additional property"
          schema={schema.additionalProperties}
          {...childProps}
        />
      )}
      {schema.allOf && (
        <div className="sp-schema-properties">
          {schema.allOf.map((member, index) => (
            <SchemaView key={index} schema={member} {...childProps} />
          ))}
        </div>
      )}
      {alternatives && (
        <div className="sp-schema-alternatives">
          {alternatives.length > 1 && (
            <div className="sp-schema-alternatives-label">Accepted shapes</div>
          )}
          {discriminator?.propertyName && (
            <p className="sp-schema-meta sp-schema-discriminator">
              Selected by <code>{discriminator.propertyName}</code>
            </p>
          )}
          <div className="sp-schema-properties">
            {alternatives.map((alternative, index) => {
              const discriminatorValue = discriminator?.valueFor(
                alternative,
                index,
              );
              return (
                <div key={index} className="sp-schema-alternative">
                  {discriminatorValue && (
                    <p className="sp-schema-meta sp-schema-discriminator-value">
                      <code>{discriminatorValue}</code>
                    </p>
                  )}
                  <SchemaView
                    name={
                      alternatives.length > 1
                        ? alternativeName(alternative, index)
                        : undefined
                    }
                    schema={alternative}
                    {...childProps}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {applicators.length > 0 && (
        <div className="sp-schema-properties">
          {applicators.map(([label, value]) => (
            <div key={label}>
              <strong>{label}</strong>
              <SchemaView schema={value} {...childProps} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function RootSchemaView({
  schema,
  required,
  depth,
  collapseObjects,
  showExample,
  showRootDescription,
  summaryOnly,
  exampleValue,
}: ResolvedSchemaViewProps & { showRootDescription: boolean }) {
  const explorable =
    depth === 0 && !summaryOnly
      ? explorableSchema(schema, exampleValue)
      : undefined;
  if (explorable) {
    return (
      <SchemaExplorer
        schema={explorable}
        showExample={showExample}
        showRootDescription={showRootDescription}
        exampleValue={exampleValue}
      />
    );
  }
  const model = schemaViewModel(schema, exampleValue, showExample);
  const className = schemaClassName(depth);
  const head = (
    <div className={schemaHeadClassName(schema, false)}>
      <SchemaHeadContents schema={schema} required={required} />
    </div>
  );
  const details = (
    <SchemaFieldDetails
      schema={schema}
      model={model}
      exampleValue={exampleValue}
      named={false}
      showScalarExample={depth === 0}
    />
  );
  const structure = (
    <SchemaStructure
      schema={schema}
      model={model}
      depth={depth}
      collapseObjects={collapseObjects}
      showExample={showExample}
      exampleValue={exampleValue}
    />
  );
  const primitive =
    depth === 0 &&
    !summaryOnly &&
    !model.isObject &&
    !model.alternatives?.length &&
    !schema.allOf?.length;

  if (primitive) {
    const hasDetails = Boolean(
      schema.description ||
      model.enumValues ||
      model.constraints.length > 0 ||
      schema.default !== undefined ||
      model.scalarExample ||
      model.inlineExample,
    );
    return (
      <section className={`${className} sp-schema-primitive`}>
        <header className="sp-schema-primitive-header">
          <span className="sp-schema-primitive-icon" aria-hidden="true">
            Aa
          </span>
          <div>{head}</div>
        </header>
        {hasDetails && (
          <div className="sp-schema-primitive-details">{details}</div>
        )}
        {structure}
      </section>
    );
  }

  if (collapseObjects && model.isObject) {
    return (
      <details className={`${className} sp-schema-object`} open>
        <summary>{head}</summary>
        {details}
        {structure}
      </details>
    );
  }

  return (
    <div className={className}>
      {head}
      {details}
      {!summaryOnly && structure}
    </div>
  );
}

function FieldSchemaView({
  schema,
  name,
  required,
  depth,
  collapseObjects,
  showExample,
  summaryOnly,
  exampleValue,
}: ResolvedSchemaViewProps & { name: string }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const model = schemaViewModel(schema, exampleValue, showExample);
  const hasDetails = Boolean(
    schema.description ||
    model.enumValues ||
    model.constraints.length > 0 ||
    schema.xml ||
    schema.externalDocs?.url ||
    schema.examples ||
    schema.default !== undefined ||
    model.scalarExample ||
    model.inlineExample,
  );
  const collapsible = collapseObjects && model.isObject;
  const toggleDetails = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDetailsOpen((open) => !open);
  };
  const toggleStructure = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setStructureOpen((open) => !open);
  };

  const card = (
    <div className="sp-schema-field-card">
      <div className={schemaHeadClassName(schema, true)}>
        {collapsible ? (
          <button
            type="button"
            className="sp-schema-structure-toggle"
            aria-expanded={structureOpen}
            aria-label={`${structureOpen ? 'Collapse' : 'Expand'} ${name}`}
            onClick={toggleStructure}
          >
            <span />
          </button>
        ) : (
          <span className="sp-schema-structure-spacer" aria-hidden="true" />
        )}
        <button
          type="button"
          className="sp-schema-head-action"
          aria-label={`Toggle field ${name}`}
          onClick={() => {
            if (collapsible) setStructureOpen((open) => !open);
            if (hasDetails) setDetailsOpen((open) => !open);
          }}
        >
          <SchemaHeadContents schema={schema} name={name} required={required} />
        </button>
        {hasDetails && (
          <button
            type="button"
            className="sp-schema-details-toggle"
            data-tooltip={
              detailsOpen ? 'Hide field details' : 'Show field details'
            }
            aria-expanded={detailsOpen}
            aria-label={`${detailsOpen ? 'Hide' : 'Show'} details for ${name}`}
            onClick={toggleDetails}
          >
            <span />
          </button>
        )}
      </div>
      {detailsOpen && (
        <SchemaFieldDetails
          schema={schema}
          model={model}
          exampleValue={exampleValue}
          named
          showScalarExample
        />
      )}
    </div>
  );
  const structure = (
    <SchemaStructure
      schema={schema}
      model={model}
      depth={depth}
      collapseObjects={collapseObjects}
      showExample={showExample}
      exampleValue={exampleValue}
    />
  );
  const className = schemaClassName(depth);

  if (collapsible) {
    return (
      <div className={`${className} sp-schema-object-shell`}>
        {card}
        <DisclosureContent
          hidden={!structureOpen}
          key={structureOpen ? 'open' : 'closed'}
        >
          {structure}
        </DisclosureContent>
      </div>
    );
  }

  return (
    <div className={className}>
      {card}
      {!summaryOnly && structure}
    </div>
  );
}

export function MediaContent({
  content,
  title,
  collapseObjects = false,
  showExamples = true,
  showRootDescription = true,
  exampleValue,
}: {
  content?: Record<string, MediaType>;
  title?: ReactNode;
  collapseObjects?: boolean;
  showExamples?: boolean;
  showRootDescription?: boolean;
  exampleValue?: unknown;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const entries = Object.entries(content ?? {});
  if (entries.length === 0) return null;
  const activeEntry = entries[activeIndex] ?? entries[0]!;
  const [mediaType, media] = activeEntry;

  return (
    <div className="sp-media-list">
      <section className="sp-media" key={mediaType}>
        <div className="sp-media-heading">
          {title && <div className="sp-media-title">{title}</div>}
          {entries.length > 1 ? (
            <ExampleSelect
              label="Media type"
              value={activeIndex}
              onChange={setActiveIndex}
              options={entries.map(([entryMediaType]) => ({
                key: entryMediaType,
                label: entryMediaType,
              }))}
            />
          ) : (
            <div className="sp-media-type">{mediaType}</div>
          )}
        </div>
        <SchemaView
          schema={media.schema}
          collapseObjects={collapseObjects}
          showExample={showExamples}
          showRootDescription={showRootDescription}
          exampleValue={exampleValue}
        />
        {media.encoding && (
          <div className="sp-media-encoding">
            <strong>Encoding</strong>
            {Object.entries(media.encoding).map(([property, encoding]) => (
              <div key={property}>
                <code>{property}</code>
                {encoding.contentType && (
                  <span> content type: {encoding.contentType}</span>
                )}
                {encoding.style && <span> style: {encoding.style}</span>}
                {encoding.explode !== undefined && (
                  <span> explode: {String(encoding.explode)}</span>
                )}
                {encoding.allowReserved !== undefined && (
                  <span> allow reserved: {String(encoding.allowReserved)}</span>
                )}
                {Object.entries(encoding.headers ?? {}).map(
                  ([name, header]) => (
                    <div key={name}>
                      Header <code>{name}</code>
                      <Markdown>{header.description}</Markdown>
                    </div>
                  ),
                )}
              </div>
            ))}
          </div>
        )}
        {showExamples && (
          <>
            {media.example !== undefined && <JsonValue value={media.example} />}
            {media.examples && <NamedMediaExamples examples={media.examples} />}
          </>
        )}
      </section>
    </div>
  );
}
