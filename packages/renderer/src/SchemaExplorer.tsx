/**
 * ---
 * purpose: Renders an explorable schema tree with a persistent field-detail pane.
 * related:
 *   - ./SchemaView.tsx - Selects this view for structural root schemas.
 *   - ./styles.css - Owns the schema explorer layout and interaction styles.
 * ---
 */

import { useState } from 'react';
import type { SchemaObject } from 'speccy-core';
import { CodeBlock } from './CodeBlock';
import { Markdown } from './Markdown';

function schemaTypeLabel(schema?: SchemaObject): string {
  if (!schema) return 'any';
  if (schema.$ref) return schema.$ref.split('/').pop() ?? 'reference';
  return schema.type === 'array'
    ? `array<${schemaTypeLabel(schema.items)}>`
    : schema.enum
      ? 'enum'
      : [schema.type ?? 'object', schema.format].filter(Boolean).join(' · ');
}

function schemaLabel(schema?: SchemaObject): string {
  return [schema?.title, schemaTypeLabel(schema)].filter(Boolean).join(' · ');
}

function ExplorerExample({ value }: { value: unknown }) {
  const serialized =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return <CodeBlock className="sp-example" value={serialized} />;
}

type ExplorerField = {
  name: string;
  schema: SchemaObject;
  required: boolean;
  path: string[];
  exampleValue?: unknown;
};

function childProperties(schema: SchemaObject): Record<string, SchemaObject> {
  if (schema.type === 'array' && schema.items) {
    return schema.items.properties ?? {};
  }
  return schema.properties ?? {};
}

function fieldChildren(field: ExplorerField): ExplorerField[] {
  const properties = childProperties(field.schema);
  const required =
    field.schema.type === 'array'
      ? field.schema.items?.required
      : field.schema.required;
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
      className={`sp-schema-explorer-chevron${open ? ' is-open' : ''}`}
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
    const path = field.path.join('.');
    const children = fieldChildren(field);
    const open = expandedPaths.has(path);
    const selected = path === selectedPath;
    return (
      <div
        className={`sp-schema-explorer-branch${depth > 0 ? ' is-nested' : ''}`}
        key={path}
        style={{ '--sp-schema-depth': depth } as React.CSSProperties}
      >
        <div
          className={`sp-schema-explorer-row${selected ? ' is-selected' : ''}${field.schema.deprecated ? ' is-deprecated' : ''}`}
        >
          {children.length > 0 ? (
            <button
              type="button"
              className="sp-schema-explorer-toggle"
              aria-expanded={open}
              aria-label={`${open ? 'Collapse' : 'Expand'} ${field.name}`}
              onClick={() => onToggle(path)}
            >
              <ExplorerChevron open={open} />
            </button>
          ) : (
            <span className="sp-schema-explorer-toggle-spacer" />
          )}
          <button
            type="button"
            className="sp-schema-explorer-select"
            aria-pressed={selected}
            onClick={() => onSelect(field.path)}
          >
            <span className="sp-schema-explorer-name">
              <code>{field.name}</code>
              {field.schema.deprecated && (
                <span className="sp-schema-explorer-deprecated">
                  Deprecated
                </span>
              )}
              {field.required && (
                <span className="sp-required" title="Required">
                  *
                </span>
              )}
            </span>
            <span className="sp-schema-explorer-type">
              {schemaLabel(field.schema)}
              {field.schema.nullable && <span>?</span>}
            </span>
          </button>
        </div>
        {children.length > 0 && open && (
          <ExplorerTree
            fields={children}
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            onSelect={onSelect}
            onToggle={onToggle}
            depth={depth + 1}
          />
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
  const enumValues =
    schema.enum ?? (schema.type === 'array' ? schema.items?.enum : undefined);
  const constraints: Array<{ label: string; value: string | number }> = [];
  if (schema.minimum !== undefined)
    constraints.push({ label: 'Minimum', value: schema.minimum });
  if (schema.maximum !== undefined)
    constraints.push({ label: 'Maximum', value: schema.maximum });
  if (schema.minLength !== undefined && schema.minLength === schema.maxLength) {
    constraints.push({
      label: 'Length',
      value: `Exactly ${schema.minLength} characters`,
    });
  } else {
    if (schema.minLength !== undefined)
      constraints.push({
        label: 'Length',
        value: `At least ${schema.minLength} characters`,
      });
    if (schema.maxLength !== undefined)
      constraints.push({
        label: 'Length',
        value: `At most ${schema.maxLength} characters`,
      });
  }
  if (schema.pattern)
    constraints.push({ label: 'Pattern', value: schema.pattern });
  const example = field.exampleValue ?? schema.example;

  return (
    <article className="sp-schema-explorer-details" aria-live="polite">
      <div className="sp-schema-explorer-path">
        {[rootName, ...field.path].join(' / ')}
      </div>
      <div className="sp-schema-explorer-detail-heading">
        <code>{field.name}</code>
        {field.required && (
          <span className="sp-schema-explorer-required">Required</span>
        )}
        {schema.deprecated && <span className="sp-deprecated">deprecated</span>}
      </div>
      <div className="sp-schema-explorer-detail-meta">
        {schema.title && <span>Schema {schema.title}</span>}
        <code>{schemaTypeLabel(schema)}</code>
        {schema.nullable && <span>Nullable</span>}
        {schema.readOnly && <span>Read only</span>}
        {schema.writeOnly && <span>Write only</span>}
      </div>
      <Markdown className="sp-schema-explorer-description">
        {schema.description}
      </Markdown>
      {enumValues && (
        <section className="sp-schema-explorer-detail-section">
          <h4>Allowed values</h4>
          <div className="sp-schema-explorer-values">
            {enumValues.map((value, index) => (
              <code key={index}>
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </code>
            ))}
          </div>
        </section>
      )}
      {constraints.length > 0 && (
        <section className="sp-schema-explorer-detail-section">
          <h4>Constraints</h4>
          <dl className="sp-schema-explorer-constraints">
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
      {schema.default !== undefined && (
        <section className="sp-schema-explorer-detail-section">
          <h4>Default</h4>
          <code className="sp-schema-explorer-value">
            {JSON.stringify(schema.default)}
          </code>
        </section>
      )}
      {showExample && example !== undefined && (
        <section className="sp-schema-explorer-detail-section">
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
  exampleValue,
}: {
  schema: SchemaObject;
  showExample: boolean;
  exampleValue?: unknown;
}) {
  const structuralSchema =
    schema.type === 'array' && schema.items ? schema.items : schema;
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
  const [selectedPath, setSelectedPath] = useState<string[]>(
    fields[0]?.path ?? [],
  );
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const selected =
    findExplorerField(fields, selectedPath) ?? fields[0] ?? undefined;

  if (!selected) return null;

  const toggle = (path: string) => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="sp-schema-explorer">
      {(schema.description ?? structuralSchema.description) && (
        <Markdown className="sp-schema-explorer-root-description">
          {schema.description ?? structuralSchema.description}
        </Markdown>
      )}
      <div className="sp-schema-explorer-shell">
        <section
          className="sp-schema-explorer-tree"
          aria-label={`${rootName} schema`}
        >
          <header className="sp-schema-explorer-header">
            <span className="sp-schema-explorer-object-icon">{'{}'}</span>
            <div>
              <strong>{rootName}</strong>
              <span>
                {schemaLabel(structuralSchema)} · {fields.length}{' '}
                {fields.length === 1 ? 'field' : 'fields'}
              </span>
            </div>
          </header>
          <div className="sp-schema-explorer-rows">
            <ExplorerTree
              fields={fields}
              selectedPath={selected.path.join('.')}
              expandedPaths={expandedPaths}
              onSelect={setSelectedPath}
              onToggle={toggle}
            />
          </div>
        </section>
        <aside className="sp-schema-explorer-inspector">
          <ExplorerFieldDetails
            field={selected}
            rootName={rootName}
            showExample={showExample}
          />
        </aside>
      </div>
    </div>
  );
}
