/**
 * ---
 * purpose: Owns the schema explorer shell, selection state, and the split between tree and inspector.
 * related:
 *   - ./SchemaExplorerTree.tsx - Renders the selectable field tree.
 *   - ./SchemaExplorerDetails.tsx - Renders the inspector for the selected field.
 *   - ./schemaExplorerModel.ts - Derives fields and labels from the schema.
 *   - ./styles.css - Owns the schema explorer layout and interaction styles.
 * ---
 */

import { useState } from 'react';
import type { SchemaObject } from 'speccy-core';
import { Markdown } from './Markdown';
import { AcceptedShapes, ExplorerFieldDetails } from './SchemaExplorerDetails';
import { ExplorerTree } from './SchemaExplorerTree';
import {
  findExplorerField,
  rootFields,
  schemaLabel,
  structuralObjectSchema,
} from './schemaExplorerModel';
import { scoped } from './schemaExplorerStyles';

function ExplorerHeader({
  rootName,
  schema,
  fieldCount,
}: {
  rootName: string;
  schema: SchemaObject;
  fieldCount: number;
}) {
  return (
    <header className={scoped('sp-schema-explorer-header')}>
      <span className={scoped('sp-schema-explorer-object-icon')}>{'{}'}</span>
      <div>
        <strong>{rootName}</strong>
        <span>
          {schemaLabel(schema)} · {fieldCount}{' '}
          {fieldCount === 1 ? 'field' : 'fields'}
        </span>
      </div>
    </header>
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
  const rootName = structuralSchema.title ?? schema.title ?? 'object';
  const rootDescription = schema.description ?? structuralSchema.description;
  const fields = rootFields(structuralSchema, exampleValue);
  const alternatives = structuralSchema.oneOf ?? structuralSchema.anyOf;
  const closedObject = structuralSchema.additionalProperties === false;
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const selected = findExplorerField(fields, selectedPath);

  if (fields.length === 0 && !alternatives?.length) return null;

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
      {showRootDescription && rootDescription && (
        <Markdown className={scoped('sp-schema-explorer-root-description')}>
          {rootDescription}
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
            <ExplorerHeader
              rootName={rootName}
              schema={structuralSchema}
              fieldCount={fields.length}
            />
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
          {closedObject && (
            <p className={scoped('sp-schema-explorer-closed')}>
              No other properties are allowed.
            </p>
          )}
          {alternatives && alternatives.length > 0 && (
            <AcceptedShapes alternatives={alternatives} />
          )}
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
