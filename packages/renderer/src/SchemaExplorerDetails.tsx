/**
 * ---
 * purpose: Renders the inspector pane describing the field selected in the schema explorer.
 * related:
 *   - ./schemaExplorerModel.ts - Derives the labels, constraints, and alternatives shown here.
 *   - ./SchemaExplorer.tsx - Chooses which field this describes.
 * ---
 */

import type { ReactNode } from 'react';
import type { Schema, SchemaObject } from 'speccy-core';
import { CodeBlock } from './CodeBlock';
import { Markdown } from './Markdown';
import {
  alternativeName,
  enumValues,
  schemaConstraints,
  schemaTypeLabel,
  structuralObjectSchema,
  type EnumValue,
  type ExplorerConstraint,
  type ExplorerField,
} from './schemaExplorerModel';
import { scoped } from './schemaExplorerStyles';

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={scoped('sp-schema-explorer-detail-section')}>
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function ExplorerExample({ value }: { value: unknown }) {
  const serialized =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return <CodeBlock className="sp-example" value={serialized} />;
}

function AllowedValues({ values }: { values: EnumValue[] }) {
  return (
    <div className={scoped('sp-schema-explorer-values')}>
      {values.map((value, index) => (
        <code key={index}>
          {typeof value === 'string' ? value : JSON.stringify(value)}
        </code>
      ))}
    </div>
  );
}

function Constraints({ constraints }: { constraints: ExplorerConstraint[] }) {
  return (
    <dl className={scoped('sp-schema-explorer-constraints')}>
      {constraints.map((constraint) => (
        <div key={constraint.label}>
          <dt>{constraint.label}</dt>
          <dd>
            <code>{constraint.value}</code>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AlternativeFields({ schema }: { schema: SchemaObject }) {
  return (
    <dl className={scoped('sp-schema-explorer-alternative-fields')}>
      {Object.entries(schema.properties ?? {}).map(([name, property]) => (
        <div key={name}>
          <dt>
            <code>{name}</code>
            {schema.required?.includes(name) && (
              <span className="sp-required" title="Required">
                *
              </span>
            )}
          </dt>
          <dd>{schemaTypeLabel(property)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Alternative({ schema, index }: { schema: Schema; index: number }) {
  const structuralSchema = structuralObjectSchema(schema);
  const hasFields = Object.keys(structuralSchema.properties ?? {}).length > 0;
  return (
    <details open={index === 0}>
      <summary>
        <strong>{alternativeName(schema, index)}</strong>
        <code>{schemaTypeLabel(schema)}</code>
      </summary>
      <Markdown
        className={scoped('sp-schema-explorer-alternative-description')}
      >
        {structuralSchema.description}
      </Markdown>
      {hasFields && <AlternativeFields schema={structuralSchema} />}
    </details>
  );
}

function AcceptedShapes({ alternatives }: { alternatives: Schema[] }) {
  return (
    <DetailSection title="Accepted shapes">
      <div className={scoped('sp-schema-explorer-alternatives')}>
        {alternatives.map((alternative, index) => (
          <Alternative key={index} schema={alternative} index={index} />
        ))}
      </div>
    </DetailSection>
  );
}

export function ExplorerFieldDetails({
  field,
  rootName,
  showExample,
}: {
  field: ExplorerField;
  rootName: string;
  showExample: boolean;
}) {
  const objectSchema = structuralObjectSchema(field.schema);
  const allowedValues = enumValues(objectSchema);
  const alternatives = objectSchema.oneOf ?? objectSchema.anyOf;
  const constraints = schemaConstraints(objectSchema);
  const example = field.exampleValue ?? objectSchema.example;

  return (
    <article
      className={scoped('sp-schema-explorer-details')}
      aria-live="polite"
    >
      <div className={scoped('sp-schema-explorer-path')}>
        {[rootName, ...field.path].join(' / ')}
      </div>
      <div className={scoped('sp-schema-explorer-detail-heading')}>
        <code>{field.name}</code>
        {field.required && (
          <span className={scoped('sp-schema-explorer-required')}>
            Required
          </span>
        )}
        {objectSchema.deprecated && (
          <span className="sp-deprecated">deprecated</span>
        )}
      </div>
      <div className={scoped('sp-schema-explorer-detail-meta')}>
        {objectSchema.title && <span>Schema {objectSchema.title}</span>}
        <code>{schemaTypeLabel(field.schema)}</code>
        {objectSchema.nullable && <span>Nullable</span>}
        {objectSchema.readOnly && <span>Read only</span>}
        {objectSchema.writeOnly && <span>Write only</span>}
      </div>
      <Markdown className={scoped('sp-schema-explorer-description')}>
        {objectSchema.description}
      </Markdown>
      {allowedValues && (
        <DetailSection title="Allowed values">
          <AllowedValues values={allowedValues} />
        </DetailSection>
      )}
      {alternatives && alternatives.length > 0 && (
        <AcceptedShapes alternatives={alternatives} />
      )}
      {constraints.length > 0 && (
        <DetailSection title="Constraints">
          <Constraints constraints={constraints} />
        </DetailSection>
      )}
      {objectSchema.default !== undefined && (
        <DetailSection title="Default">
          <code className={scoped('sp-schema-explorer-value')}>
            {JSON.stringify(objectSchema.default)}
          </code>
        </DetailSection>
      )}
      {showExample && example !== undefined && (
        <DetailSection title="Example">
          <ExplorerExample value={example} />
        </DetailSection>
      )}
    </article>
  );
}
