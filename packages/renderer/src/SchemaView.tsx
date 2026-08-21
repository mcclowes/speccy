/**
 * ---
 * purpose: Renders recursive schema trees, per-field detail disclosure, and every declared media type's examples.
 * related:
 *   - ./Speccy.tsx - Uses these primitives for parameters, requests, and responses.
 *   - ./ReferenceSections.tsx - Uses them for reusable component catalogues.
 * ---
 */

import { type ReactNode, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import { DisclosureContent } from './DesignSystem';
import { ExampleSelect } from './ExampleSelect';
import { Markdown } from './Markdown';
import { SchemaExplorer } from './SchemaExplorer';
import {
  discriminatorModel,
  rootFields,
  schemaLabel,
  structuralObjectSchema,
  unsupportedByExplorer,
} from './schemaExplorerModel';
import type { MediaType, Schema, SchemaObject } from 'speccy-core';

function alternativeName(schema: Schema, index: number): string {
  if (typeof schema === 'boolean') return schema ? 'Any value' : 'No value';
  if (!schema.title) return `Option ${index + 1}`;
  return schema.title
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ');
}

function schemaFromExample(value: unknown): SchemaObject {
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? schemaFromExample(value[0]) : {},
    };
  }
  if (value !== null && typeof value === 'object') {
    return {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(value).map(([name, fieldValue]) => [
          name,
          schemaFromExample(fieldValue),
        ]),
      ),
    };
  }
  if (value === null) return { nullable: true };
  return { type: typeof value };
}

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
}: {
  schema?: Schema;
  name?: string;
  required?: boolean;
  depth?: number;
  collapseObjects?: boolean;
  showExample?: boolean;
  showRootDescription?: boolean;
  summaryOnly?: boolean;
  exampleValue?: unknown;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(!name);
  if (schema === undefined) return null;
  if (typeof schema === 'boolean') {
    return (
      <p className="sp-schema-boolean">
        {schema ? 'Any value is allowed.' : 'No value is allowed.'}
      </p>
    );
  }
  const explorerSchema = structuralObjectSchema(schema);
  const exampleSchema =
    exampleValue !== null &&
    typeof exampleValue === 'object' &&
    !Array.isArray(exampleValue)
      ? schemaFromExample(exampleValue)
      : undefined;
  // An example only stands in for a schema that describes no shape of its own; borrowing its
  // keys for a composed schema would present one branch as if it were the whole contract.
  const schemaWithExampleFields =
    Object.keys(explorerSchema.properties ?? {}).length === 0 &&
    exampleSchema &&
    !explorerSchema.oneOf &&
    !explorerSchema.anyOf &&
    explorerSchema.additionalProperties === undefined &&
    !explorerSchema.patternProperties
      ? { ...schema, properties: exampleSchema.properties }
      : schema;
  const displayExplorerSchema = structuralObjectSchema(schemaWithExampleFields);
  if (
    depth === 0 &&
    !name &&
    !summaryOnly &&
    !schema.xml &&
    !schema.externalDocs &&
    !unsupportedByExplorer(displayExplorerSchema) &&
    rootFields(displayExplorerSchema, exampleValue).length > 0
  ) {
    return (
      <SchemaExplorer
        schema={schemaWithExampleFields}
        showExample={showExample}
        showRootDescription={showRootDescription}
        exampleValue={exampleValue}
      />
    );
  }
  const properties = schema.properties ?? {};
  const alternatives = schema.oneOf ?? schema.anyOf;
  const discriminator = discriminatorModel(schema);
  const isObject =
    schema.type === 'object' || Object.keys(properties).length > 0;
  const enumValues =
    schema.enum ??
    (schema.type === 'array' && typeof schema.items === 'object'
      ? schema.items.enum
      : undefined);
  const constraints: Array<{ label: string; value: unknown }> = [];
  if (schema.minimum !== undefined)
    constraints.push({ label: 'min', value: schema.minimum });
  if (schema.maximum !== undefined)
    constraints.push({ label: 'max', value: schema.maximum });
  if (schema.exclusiveMinimum !== undefined)
    constraints.push({
      label: 'exclusive min',
      value: schema.exclusiveMinimum,
    });
  if (schema.exclusiveMaximum !== undefined)
    constraints.push({
      label: 'exclusive max',
      value: schema.exclusiveMaximum,
    });
  if (schema.multipleOf !== undefined)
    constraints.push({ label: 'multiple of', value: schema.multipleOf });
  if (schema.minLength !== undefined)
    constraints.push({ label: 'min length', value: schema.minLength });
  if (schema.maxLength !== undefined)
    constraints.push({ label: 'max length', value: schema.maxLength });
  if (schema.pattern)
    constraints.push({ label: 'pattern', value: schema.pattern });
  if (schema.minItems !== undefined)
    constraints.push({ label: 'min items', value: schema.minItems });
  if (schema.maxItems !== undefined)
    constraints.push({ label: 'max items', value: schema.maxItems });
  if (schema.minContains !== undefined)
    constraints.push({ label: 'min contains', value: schema.minContains });
  if (schema.maxContains !== undefined)
    constraints.push({ label: 'max contains', value: schema.maxContains });
  if (schema.uniqueItems !== undefined)
    constraints.push({ label: 'unique items', value: schema.uniqueItems });
  if (schema.minProperties !== undefined)
    constraints.push({ label: 'min properties', value: schema.minProperties });
  if (schema.maxProperties !== undefined)
    constraints.push({ label: 'max properties', value: schema.maxProperties });
  if (schema.dependentRequired)
    constraints.push({
      label: 'dependent required',
      value: schema.dependentRequired,
    });
  if (schema.additionalProperties === false)
    constraints.push({
      label: 'additional properties',
      value: 'not allowed',
    });
  if (schema.const !== undefined)
    constraints.push({ label: 'const', value: schema.const });
  if (schema.contentEncoding)
    constraints.push({
      label: 'content encoding',
      value: schema.contentEncoding,
    });
  if (schema.contentMediaType)
    constraints.push({
      label: 'content media type',
      value: schema.contentMediaType,
    });
  for (const [label, value] of [
    ['schema dialect', schema.$schema],
    ['schema id', schema.$id],
    ['anchor', schema.$anchor],
    ['dynamic anchor', schema.$dynamicAnchor],
    ['dynamic reference', schema.$dynamicRef],
  ] as const) {
    if (value) constraints.push({ label, value });
  }
  const hasFieldDetails = Boolean(
    name &&
    (schema.description ||
      enumValues ||
      constraints.length > 0 ||
      schema.default !== undefined ||
      (exampleValue !== undefined &&
        (exampleValue === null || typeof exampleValue !== 'object')) ||
      (exampleValue === undefined &&
        showExample &&
        schema.example !== undefined)),
  );

  const toggleDetails = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDetailsOpen((open) => !open);
  };

  const toggleStructure = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setStructureOpen((open) => !open);
  };

  const headerContents = (
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
  const headerClassName = `sp-schema-head${name ? ' sp-schema-head-named' : ''}${schema.deprecated ? ' sp-schema-head-deprecated' : ''}`;
  const detailsToggle = name && hasFieldDetails && (
    <button
      type="button"
      className="sp-schema-details-toggle"
      data-tooltip={detailsOpen ? 'Hide field details' : 'Show field details'}
      aria-expanded={detailsOpen}
      aria-label={`${detailsOpen ? 'Hide' : 'Show'} details for ${name}`}
      onClick={toggleDetails}
    >
      <span />
    </button>
  );
  const namedHeader = (hasStructure: boolean) => (
    <div className={headerClassName}>
      {hasStructure && (
        <button
          type="button"
          className="sp-schema-structure-toggle"
          aria-expanded={structureOpen}
          aria-label={`${structureOpen ? 'Collapse' : 'Expand'} ${name}`}
          onClick={toggleStructure}
        >
          <span />
        </button>
      )}
      {!hasStructure && (
        <span className="sp-schema-structure-spacer" aria-hidden="true" />
      )}
      <button
        type="button"
        className="sp-schema-head-action"
        aria-label={`Toggle field ${name}`}
        onClick={() => {
          if (hasStructure) setStructureOpen((open) => !open);
          if (hasFieldDetails) setDetailsOpen((open) => !open);
        }}
      >
        {headerContents}
      </button>
      {detailsToggle}
    </div>
  );
  const header = name ? (
    namedHeader(false)
  ) : (
    <div className={headerClassName}>{headerContents}</div>
  );
  const fieldDetails = (
    <div
      className={`sp-schema-field-details${name ? ' sp-schema-field-details-named' : ''}`}
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
      {enumValues && (
        <p className="sp-schema-meta sp-schema-enum">
          <span>Enum:</span>
          {enumValues.map((value, index) => (
            <code key={index}>
              {typeof value === 'string' ? value : JSON.stringify(value)}
            </code>
          ))}
        </p>
      )}
      {constraints.length > 0 && (
        <p className="sp-schema-meta sp-schema-constraints">
          {constraints.map((constraint) => (
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
      {(name || depth === 0) &&
        exampleValue !== undefined &&
        (exampleValue === null || typeof exampleValue !== 'object') && (
          <p className="sp-schema-meta sp-schema-example">
            <span>Example</span>
            <code>
              {typeof exampleValue === 'string'
                ? exampleValue
                : JSON.stringify(exampleValue)}
            </code>
          </p>
        )}
      {exampleValue === undefined &&
        showExample &&
        schema.example !== undefined && (
          <>
            <div className="sp-schema-meta">Example</div>
            <JsonValue value={schema.example} />
          </>
        )}
    </div>
  );
  const applicators: Array<[string, Schema]> = [
    ...Object.entries(schema.$defs ?? {}).map(
      ([definition, value]) =>
        [`Definition ${definition}`, value] as [string, Schema],
    ),
    ...(schema.prefixItems ?? []).map(
      (item, index) => [`Prefix item ${index + 1}`, item] as [string, Schema],
    ),
    ...(schema.contains === undefined
      ? []
      : ([['Contains', schema.contains]] as Array<[string, Schema]>)),
    ...Object.entries(schema.patternProperties ?? {}).map(
      ([pattern, value]) => [`Pattern ${pattern}`, value] as [string, Schema],
    ),
    ...Object.entries(schema.dependentSchemas ?? {}).map(
      ([property, value]) =>
        [`Depends on ${property}`, value] as [string, Schema],
    ),
    ...(schema.propertyNames === undefined
      ? []
      : ([['Property names', schema.propertyNames]] as Array<
          [string, Schema]
        >)),
    ...(schema.if === undefined
      ? []
      : ([['If', schema.if]] as Array<[string, Schema]>)),
    ...(schema.then === undefined
      ? []
      : ([['Then', schema.then]] as Array<[string, Schema]>)),
    ...(schema.else === undefined
      ? []
      : ([['Else', schema.else]] as Array<[string, Schema]>)),
    ...(schema.not === undefined
      ? []
      : ([['Not', schema.not]] as Array<[string, Schema]>)),
    ...(schema.unevaluatedProperties === undefined
      ? []
      : ([['Unevaluated properties', schema.unevaluatedProperties]] as Array<
          [string, Schema]
        >)),
    ...(schema.unevaluatedItems === undefined
      ? []
      : ([['Unevaluated items', schema.unevaluatedItems]] as Array<
          [string, Schema]
        >)),
  ];
  const structuralBody = (
    <>
      {Object.entries(properties).length > 0 && (
        <div className="sp-schema-properties">
          {Object.entries(properties).map(([propertyName, property]) => (
            <SchemaView
              key={propertyName}
              name={propertyName}
              schema={property}
              required={schema.required?.includes(propertyName)}
              depth={depth + 1}
              collapseObjects={collapseObjects}
              showExample={showExample}
              exampleValue={
                exampleValue &&
                typeof exampleValue === 'object' &&
                !Array.isArray(exampleValue)
                  ? (exampleValue as Record<string, unknown>)[propertyName]
                  : undefined
              }
            />
          ))}
        </div>
      )}
      {schema.items && depth < 6 && (
        <SchemaView
          name="items"
          schema={schema.items}
          depth={depth + 1}
          collapseObjects={collapseObjects}
          showExample={showExample}
          exampleValue={
            Array.isArray(exampleValue) ? exampleValue[0] : undefined
          }
        />
      )}
      {typeof schema.additionalProperties === 'object' && (
        <SchemaView
          name="additional property"
          schema={schema.additionalProperties}
          depth={depth + 1}
          collapseObjects={collapseObjects}
          showExample={showExample}
        />
      )}
      {schema.allOf && (
        <div className="sp-schema-properties">
          {schema.allOf.map((member, index) => (
            <SchemaView
              key={index}
              schema={member}
              depth={depth + 1}
              collapseObjects={collapseObjects}
              showExample={showExample}
            />
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
                    depth={depth + 1}
                    collapseObjects={collapseObjects}
                    showExample={showExample}
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
              <SchemaView
                schema={value}
                depth={depth + 1}
                collapseObjects={collapseObjects}
                showExample={showExample}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
  const className = `sp-schema sp-schema-depth-${Math.min(depth, 3)}`;
  const hasRootDetails = Boolean(
    schema.description ||
    enumValues ||
    constraints.length > 0 ||
    schema.default !== undefined ||
    (exampleValue !== undefined &&
      (exampleValue === null || typeof exampleValue !== 'object')) ||
    (showExample && schema.example !== undefined),
  );

  if (
    depth === 0 &&
    !name &&
    !isObject &&
    !alternatives?.length &&
    !schema.allOf?.length &&
    !summaryOnly
  ) {
    return (
      <section className={`${className} sp-schema-primitive`}>
        <header className="sp-schema-primitive-header">
          <span className="sp-schema-primitive-icon" aria-hidden="true">
            Aa
          </span>
          <div>{header}</div>
        </header>
        {hasRootDetails && (
          <div className="sp-schema-primitive-details">{fieldDetails}</div>
        )}
        {structuralBody}
      </section>
    );
  }

  if (collapseObjects && isObject) {
    if (name) {
      return (
        <div className={`${className} sp-schema-object-shell`}>
          <div className="sp-schema-field-card">
            {namedHeader(true)}
            {detailsOpen && fieldDetails}
          </div>
          <DisclosureContent
            hidden={!structureOpen}
            key={structureOpen ? 'open' : 'closed'}
          >
            {structuralBody}
          </DisclosureContent>
        </div>
      );
    }

    return (
      <>
        <details className={`${className} sp-schema-object`} open>
          <summary>{header}</summary>
          {fieldDetails}
          {structuralBody}
        </details>
      </>
    );
  }

  return (
    <div className={className}>
      {name ? (
        <div className="sp-schema-field-card">
          {header}
          {detailsOpen && fieldDetails}
        </div>
      ) : (
        <>
          {header}
          {fieldDetails}
        </>
      )}
      {!summaryOnly && structuralBody}
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
        {showExamples && media.example !== undefined && (
          <JsonValue value={media.example} />
        )}
        {showExamples && media.examples && (
          <NamedMediaExamples examples={media.examples} />
        )}
      </section>
    </div>
  );
}
