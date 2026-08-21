/**
 * ---
 * purpose: Renders schema fields as an expandable tree of selectable rows.
 * related:
 *   - ./schemaExplorerModel.ts - Supplies the fields, children, and type labels.
 *   - ./SchemaExplorer.tsx - Owns the selection and expansion state this reports to.
 * ---
 */

import type { SchemaObject } from 'speccy-core';
import { DisclosureContent } from './DesignSystem';
import {
  fieldChildren,
  schemaTypeLabel,
  structuralObjectSchema,
  type ExplorerField,
} from './schemaExplorerModel';
import { scoped } from './schemaExplorerStyles';

interface ExplorerTreeProps {
  fields: ExplorerField[];
  selectedPath: string;
  expandedPaths: Set<string>;
  onSelect: (path: string[]) => void;
  onToggle: (path: string) => void;
  depth?: number;
}

function ExplorerToggle({
  open,
  name,
  onToggle,
}: {
  open: boolean;
  name: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={scoped('sp-schema-explorer-toggle')}
      aria-expanded={open}
      aria-label={`${open ? 'Collapse' : 'Expand'} ${name}`}
      onClick={onToggle}
    >
      <span
        aria-hidden="true"
        className={scoped(
          `sp-schema-explorer-chevron${open ? ' is-open' : ''}`,
        )}
      />
    </button>
  );
}

function ExplorerFieldLabel({
  field,
  schema,
}: {
  field: ExplorerField;
  schema: SchemaObject;
}) {
  return (
    <>
      <span className={scoped('sp-schema-explorer-name')}>
        <code>{field.name}</code>
        {schema.deprecated && (
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
        {schema.title && (
          <span
            className={scoped('sp-schema-explorer-model')}
            title={schema.title}
          >
            {schema.title} ·&nbsp;
          </span>
        )}
        <span className={scoped('sp-schema-explorer-primitive')}>
          {schemaTypeLabel(field.schema)}
          {schema.nullable && <span>?</span>}
        </span>
      </span>
    </>
  );
}

function ExplorerBranch({
  field,
  selectedPath,
  expandedPaths,
  onSelect,
  onToggle,
  depth,
}: Omit<ExplorerTreeProps, 'fields' | 'depth'> & {
  field: ExplorerField;
  depth: number;
}) {
  const fieldObject = structuralObjectSchema(field.schema);
  const path = field.path.join('.');
  const children = fieldChildren(field);
  const expandable = children.length > 0;
  const open = expandedPaths.has(path);
  const selected = path === selectedPath;
  return (
    <div
      className={scoped(
        `sp-schema-explorer-branch${depth > 0 ? ' is-nested' : ''}`,
      )}
      style={{ '--sp-schema-depth': depth } as React.CSSProperties}
    >
      <div
        className={scoped(
          `sp-schema-explorer-row${selected ? ' is-selected' : ''}${fieldObject.deprecated ? ' is-deprecated' : ''}`,
        )}
      >
        {expandable ? (
          <ExplorerToggle
            open={open}
            name={field.name}
            onToggle={() => onToggle(path)}
          />
        ) : (
          <span className={scoped('sp-schema-explorer-toggle-spacer')} />
        )}
        <button
          type="button"
          className={scoped('sp-schema-explorer-select')}
          aria-pressed={selected}
          onClick={() => {
            onSelect(field.path);
            if (expandable && !open) onToggle(path);
          }}
        >
          <ExplorerFieldLabel field={field} schema={fieldObject} />
        </button>
      </div>
      {expandable && open && (
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
}

export function ExplorerTree({
  fields,
  selectedPath,
  expandedPaths,
  onSelect,
  onToggle,
  depth = 0,
}: ExplorerTreeProps) {
  return fields.map((field) => (
    <ExplorerBranch
      key={field.path.join('.')}
      field={field}
      selectedPath={selectedPath}
      expandedPaths={expandedPaths}
      onSelect={onSelect}
      onToggle={onToggle}
      depth={depth}
    />
  ));
}
