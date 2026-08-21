/**
 * ---
 * purpose: Renders an explorable schema tree with a persistent field-detail pane.
 * related:
 *   - ./SchemaView.tsx - Selects this view for structural root schemas.
 *   - ./styles.css - Owns the schema explorer layout and interaction styles.
 * ---
 */

import { useState } from 'react';
import type { Schema, SchemaObject } from 'speccy-core';
import { CodeBlock } from './CodeBlock';
import { DisclosureContent } from './DesignSystem';
import { Markdown } from './Markdown';
import styles from './SchemaExplorer.module.css';

function scoped(className: string) {
  return className
    .split(' ')
    .flatMap((name) => (name ? [name, styles[name]] : []))
    .filter(Boolean)
    .join(' ');
}

function schemaTypeLabel(schema?: Schema): string {
  if (schema === undefined || schema === true) return 'any';
  if (schema === false) return 'never';
  if (schema.$ref) return schema.$ref.split('/').pop() ?? 'reference';
  return schema.type === 'array'
    ? `array<${schemaTypeLabel(schema.items)}>`
    : schema.enum
      ? 'enum'
      : [schema.type ?? 'object', schema.format].filter(Boolean).join(' · ');
}

function schemaLabel(schema?: Schema): string {
  return [
    typeof schema === 'object' ? schema.title : undefined,
    schemaTypeLabel(schema),
  ]
    .filter(Boolean)
    .join(' · ');
}

function alternativeName(schema: Schema, index: number): string {
  if (typeof schema === 'boolean') return schema ? 'Any value' : 'No value';
  const name = schema.title ?? schema.$ref?.split('/').pop();
  if (!name) return `Option ${index + 1}`;
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ');
}

function ExplorerExample({ value }: { value: unknown }) {
  const serialized =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return <CodeBlock className="sp-example" value={serialized} />;
}

function ExplorerAlternatives({ alternatives }: { alternatives: Schema[] }) {
  return (
    <section className={scoped('sp-schema-explorer-detail-section')}>
      <h4>Accepted shapes</h4>
      <div className={scoped('sp-schema-explorer-alternatives')}>
        {alternatives.map((alternative, index) => {
          const structuralSchema = structuralObjectSchema(alternative);
          const properties = structuralSchema.properties ?? {};
          return (
            <details key={index} open={index === 0}>
              <summary>
                <strong>{alternativeName(alternative, index)}</strong>
                <code>{schemaTypeLabel(alternative)}</code>
              </summary>
              <Markdown
                className={scoped('sp-schema-explorer-alternative-description')}
              >
                {structuralSchema.description}
              </Markdown>
              {Object.keys(properties).length > 0 && (
                <dl className={scoped('sp-schema-explorer-alternative-fields')}>
                  {Object.entries(properties).map(([name, property]) => (
                    <div key={name}>
                      <dt>
                        <code>{name}</code>
                        {structuralSchema.required?.includes(name) && (
                          <span className="sp-required" title="Required">
                            *
                          </span>
                        )}
                      </dt>
                      <dd>{schemaTypeLabel(property)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </details>
          );
        })}
      </div>
    </section>
  );
}

type ExplorerField = {
  name: string;
  schema: Schema;
  required: boolean;
  path: string[];
  exampleValue?: unknown;
};

export function structuralObjectSchema(schema: Schema): SchemaObject {
  if (typeof schema === 'boolean')
    return {
      description: schema ? 'Any value is allowed.' : 'No value is allowed.',
    };
  const base = schema.type === 'array' && schema.items ? schema.items : schema;
  if (typeof base === 'boolean') return structuralObjectSchema(base);
  const members = (base.allOf ?? []).map(structuralObjectSchema);
  if (members.length === 0) return base;

  const properties = Object.assign(
    {},
    ...members.map((member) => member.properties ?? {}),
    base.properties ?? {},
  );
  const required = [
    ...new Set([
      ...members.flatMap((member) => member.required ?? []),
      ...(base.required ?? []),
    ]),
  ];

  return {
    ...base,
    type: base.type ?? members.find((member) => member.type)?.type,
    properties,
    required,
  };
}

function childProperties(schema: SchemaObject): Record<string, Schema> {
  return structuralObjectSchema(schema).properties ?? {};
}

function fieldChildren(field: ExplorerField): ExplorerField[] {
  const structuralSchema = structuralObjectSchema(field.schema);
  const properties = childProperties(structuralSchema);
  const required = structuralSchema.required;
  return Object.entries(properties).map(([name, schema]) => ({
    name,
    schema,
    required: required?.includes(name) ?? false,
    path: [...field.path, name],
    exampleValue:
      field.exampleValue &&
      typeof field.exampleValue === 'object' &&
      !Array.isArray(field.exampleValue)
        ? (field.exampleValue as Record<string, unknown>)[name]
        : undefined,
  }));
}

function findExplorerField(
  fields: ExplorerField[],
  path: string[],
): ExplorerField | undefined {
  let level = fields;
  let selected: ExplorerField | undefined;
  for (const segment of path) {
    selected = level.find((field) => field.name === segment);
    if (!selected) return undefined;
    level = fieldChildren(selected);
  }
  return selected;
}

function ExplorerChevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={scoped(`sp-schema-explorer-chevron${open ? ' is-open' : ''}`)}
    />
  );
}

function ExplorerTree({
  fields,
  selectedPath,
  expandedPaths,
  onSelect,
  onToggle,
  depth = 0,
}: {
  fields: ExplorerField[];
  selectedPath: string;
  expandedPaths: Set<string>;
  onSelect: (path: string[]) => void;
  onToggle: (path: string) => void;
  depth?: number;
}) {
  return fields.map((field) => {
    const fieldObject = structuralObjectSchema(field.schema);
    const path = field.path.join('.');
    const children = fieldChildren(field);
    const open = expandedPaths.has(path);
    const selected = path === selectedPath;
    return (
      <div
        className={scoped(
          `sp-schema-explorer-branch${depth > 0 ? ' is-nested' : ''}`,
        )}
        key={path}
        style={{ '--sp-schema-depth': depth } as React.CSSProperties}
      >
        <div
          className={scoped(
            `sp-schema-explorer-row${selected ? ' is-selected' : ''}${fieldObject.deprecated ? ' is-deprecated' : ''}`,
          )}
        >
          {children.length > 0 ? (
            <button
              type="button"
              className={scoped('sp-schema-explorer-toggle')}
              aria-expanded={open}
              aria-label={`${open ? 'Collapse' : 'Expand'} ${field.name}`}
              onClick={() => onToggle(path)}
            >
              <ExplorerChevron open={open} />
            </button>
          ) : (
            <span className={scoped('sp-schema-explorer-toggle-spacer')} />
          )}
          <button
            type="button"
            className={scoped('sp-schema-explorer-select')}
            aria-pressed={selected}
            onClick={() => {
              onSelect(field.path);
              if (children.length > 0 && !open) onToggle(path);
            }}
          >
            <span className={scoped('sp-schema-explorer-name')}>
              <code>{field.name}</code>
              {fieldObject.deprecated && (
                <span className={scoped('sp-schema-explorer-deprecated')}>
                  Deprecated
                </span>
              )}
              {field.required && (
                <span className="sp-required" title="Required">
                  *
                </span>
              )}
            </span>
            <span className={scoped('sp-schema-explorer-type')}>
              {fieldObject.title && (
                <>
                  <span
                    className={scoped('sp-schema-explorer-model')}
                    title={fieldObject.title}
                  >
                    {fieldObject.title} ·&nbsp;
                  </span>
                </>
              )}
              <span className={scoped('sp-schema-explorer-primitive')}>
                {schemaTypeLabel(field.schema)}
                {fieldObject.nullable && <span>?</span>}
              </span>
            </span>
          </button>
        </div>
        {children.length > 0 && open && (
          <DisclosureContent className={scoped('sp-schema-explorer-children')}>
            <ExplorerTree
              fields={children}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onSelect={onSelect}
              onToggle={onToggle}
              depth={depth + 1}
            />
          </DisclosureContent>
        )}
      </div>
    );
  });
}

function ExplorerFieldDetails({
  field,
  rootName,
  showExample,
}: {
  field: ExplorerField;
  rootName: string;
  showExample: boolean;
}) {
  const schema = field.schema;
  const objectSchema = structuralObjectSchema(schema);
  const enumValues =
    objectSchema.enum ??
    (objectSchema.type === 'array' && typeof objectSchema.items === 'object'
      ? objectSchema.items.enum
      : undefined);
  const alternatives = objectSchema.oneOf ?? objectSchema.anyOf;
  const constraints: Array<{ label: string; value: string | number }> = [];
  if (objectSchema.minimum !== undefined)
    constraints.push({ label: 'Minimum', value: objectSchema.minimum });
  if (objectSchema.maximum !== undefined)
    constraints.push({ label: 'Maximum', value: objectSchema.maximum });
  if (
    objectSchema.minLength !== undefined &&
    objectSchema.minLength === objectSchema.maxLength
  ) {
    constraints.push({
      label: 'Length',
      value: `Exactly ${objectSchema.minLength} characters`,
    });
  } else {
    if (objectSchema.minLength !== undefined)
      constraints.push({
        label: 'Length',
        value: `At least ${objectSchema.minLength} characters`,
      });
    if (objectSchema.maxLength !== undefined)
      constraints.push({
        label: 'Length',
        value: `At most ${objectSchema.maxLength} characters`,
      });
  }
  if (objectSchema.pattern)
    constraints.push({ label: 'Pattern', value: objectSchema.pattern });
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
        <code>{schemaTypeLabel(schema)}</code>
        {objectSchema.nullable && <span>Nullable</span>}
        {objectSchema.readOnly && <span>Read only</span>}
        {objectSchema.writeOnly && <span>Write only</span>}
      </div>
      <Markdown className={scoped('sp-schema-explorer-description')}>
        {objectSchema.description}
      </Markdown>
      {enumValues && (
        <section className={scoped('sp-schema-explorer-detail-section')}>
          <h4>Allowed values</h4>
          <div className={scoped('sp-schema-explorer-values')}>
            {enumValues.map((value, index) => (
              <code key={index}>
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </code>
            ))}
          </div>
        </section>
      )}
      {alternatives && alternatives.length > 0 && (
        <ExplorerAlternatives alternatives={alternatives} />
      )}
      {constraints.length > 0 && (
        <section className={scoped('sp-schema-explorer-detail-section')}>
          <h4>Constraints</h4>
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
        </section>
      )}
      {objectSchema.default !== undefined && (
        <section className={scoped('sp-schema-explorer-detail-section')}>
          <h4>Default</h4>
          <code className={scoped('sp-schema-explorer-value')}>
            {JSON.stringify(objectSchema.default)}
          </code>
        </section>
      )}
      {showExample && example !== undefined && (
        <section className={scoped('sp-schema-explorer-detail-section')}>
          <h4>Example</h4>
          <ExplorerExample value={example} />
        </section>
      )}
    </article>
  );
}

export function SchemaExplorer({
  schema,
  showExample,
  showHeader = true,
  showRootDescription = true,
  exampleValue,
}: {
  schema: SchemaObject;
  showExample: boolean;
  showHeader?: boolean;
  showRootDescription?: boolean;
  exampleValue?: unknown;
}) {
  const structuralSchema = structuralObjectSchema(schema);
  const properties = structuralSchema.properties ?? {};
  const rootName = structuralSchema.title ?? schema.title ?? 'object';
  const fields = Object.entries(properties).map(([name, fieldSchema]) => ({
    name,
    schema: fieldSchema,
    required: structuralSchema.required?.includes(name) ?? false,
    path: [name],
    exampleValue:
      exampleValue &&
      typeof exampleValue === 'object' &&
      !Array.isArray(exampleValue)
        ? (exampleValue as Record<string, unknown>)[name]
        : Array.isArray(exampleValue) &&
            exampleValue[0] &&
            typeof exampleValue[0] === 'object'
          ? (exampleValue[0] as Record<string, unknown>)[name]
          : undefined,
  }));
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const selected = findExplorerField(fields, selectedPath);

  if (fields.length === 0) return null;

  const toggle = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const select = (path: string[]) => {
    setSelectedPath((current) =>
      current.join('.') === path.join('.') ? [] : path,
    );
  };

  return (
    <div className={scoped('sp-schema-explorer')}>
      {showRootDescription &&
        (schema.description ?? structuralSchema.description) && (
          <Markdown className={scoped('sp-schema-explorer-root-description')}>
            {schema.description ?? structuralSchema.description}
          </Markdown>
        )}
      <div
        className={scoped(
          `sp-schema-explorer-shell${selected ? ' has-selection' : ''}`,
        )}
      >
        <section
          className={scoped('sp-schema-explorer-tree')}
          aria-label={`${rootName} schema`}
        >
          {showHeader && (
            <header className={scoped('sp-schema-explorer-header')}>
              <span className={scoped('sp-schema-explorer-object-icon')}>
                {'{}'}
              </span>
              <div>
                <strong>{rootName}</strong>
                <span>
                  {schemaLabel(structuralSchema)} · {fields.length}{' '}
                  {fields.length === 1 ? 'field' : 'fields'}
                </span>
              </div>
            </header>
          )}
          <div className={scoped('sp-schema-explorer-rows')}>
            <ExplorerTree
              fields={fields}
              selectedPath={selected?.path.join('.') ?? ''}
              expandedPaths={expandedPaths}
              onSelect={select}
              onToggle={toggle}
            />
          </div>
        </section>
        {selected && (
          <aside className={scoped('sp-schema-explorer-inspector')}>
            <ExplorerFieldDetails
              field={selected}
              rootName={rootName}
              showExample={showExample}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
