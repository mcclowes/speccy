/**
 * PROTOTYPE: Three field-detail layouts, switchable with `?variant=`, for deciding
 * how schemas should balance scanning, deep navigation, and persistent detail.
 */

import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import './SchemaExplorerPrototype.css';

type Field = {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  nullable?: boolean;
  deprecated?: boolean;
  format?: string;
  example?: string;
  values?: string[];
  children?: Field[];
};

const fields: Field[] = [
  {
    name: 'id',
    type: 'string',
    format: 'uuid',
    required: true,
    description: 'Unique identifier for this transaction category.',
    example: '65b36c4f-7b3a-4b1e-9b16-8cadf489eec7',
  },
  {
    name: 'name',
    type: 'string',
    required: true,
    description:
      'Human-readable name shown alongside categorized transactions.',
    example: 'Food and dining',
  },
  {
    name: 'parentId',
    type: 'string',
    format: 'uuid',
    nullable: true,
    description:
      'Identifier of the parent category. Root categories have no parent.',
    example: '237836a2-ef8c-46e8-9952-33dfdb4676a6',
  },
  {
    name: 'hasChildren',
    type: 'boolean',
    required: true,
    description: 'Whether this category contains one or more child categories.',
    example: 'true',
  },
  {
    name: 'status',
    type: 'TransactionCategoryStatus',
    required: true,
    description: 'Current lifecycle status of the transaction category.',
    values: ['active', 'inactive', 'archived'],
    example: 'active',
  },
  {
    name: 'merchant',
    type: 'Merchant',
    description: 'Normalized merchant information attached to the category.',
    children: [
      {
        name: 'displayName',
        type: 'string',
        required: true,
        description: 'Normalized merchant name suitable for display.',
        example: 'The Good Grocer',
      },
      {
        name: 'website',
        type: 'string',
        format: 'uri',
        nullable: true,
        description: 'Canonical website for the merchant, when known.',
        example: 'https://goodgrocer.example',
      },
      {
        name: 'location',
        type: 'Location',
        description: 'Location associated with the transaction.',
        children: [
          {
            name: 'city',
            type: 'string',
            description: 'City reported by the payment network.',
            example: 'London',
          },
          {
            name: 'countryCode',
            type: 'string',
            format: 'ISO 3166-1 alpha-2',
            required: true,
            description: 'Two-letter country code for the merchant location.',
            example: 'GB',
          },
        ],
      },
    ],
  },
  {
    name: 'aliases',
    type: 'string[]',
    description: 'Alternative labels that can resolve to this category.',
    example: '["Restaurants", "Eating out"]',
  },
  {
    name: 'legacyCode',
    type: 'string',
    deprecated: true,
    nullable: true,
    description: 'Legacy category code. Use id for all new integrations.',
    example: 'DINING_01',
  },
];

const variants = [
  { key: 'A', name: 'List + inspector' },
  { key: 'B', name: 'Drill-in navigator' },
  { key: 'C', name: 'Tree + reading pane' },
] as const;

function Chevron({ direction = 'right' }: { direction?: 'right' | 'down' }) {
  return (
    <span
      className={`sep-chevron sep-chevron-${direction}`}
      aria-hidden="true"
    />
  );
}

function TypeLabel({ field }: { field: Field }) {
  return (
    <span className="sep-type">
      {field.type}
      {field.nullable && <span className="sep-nullable">?</span>}
    </span>
  );
}

function FieldDetail({ field, path }: { field: Field; path: string[] }) {
  return (
    <article className="sep-detail" aria-live="polite">
      <div className="sep-detail-path">{path.join(' / ')}</div>
      <div className="sep-detail-title-row">
        <h3>{field.name}</h3>
        {field.deprecated && <span className="sep-flag">Deprecated</span>}
      </div>
      <p className="sep-detail-description">{field.description}</p>
      <dl className="sep-detail-facts">
        <div>
          <dt>Type</dt>
          <dd>{field.type}</dd>
        </div>
        <div>
          <dt>Required</dt>
          <dd>{field.required ? 'Yes' : 'No'}</dd>
        </div>
        {field.nullable && (
          <div>
            <dt>Nullable</dt>
            <dd>Yes</dd>
          </div>
        )}
        {field.format && (
          <div>
            <dt>Format</dt>
            <dd>{field.format}</dd>
          </div>
        )}
      </dl>
      {field.values && (
        <section className="sep-detail-section">
          <h4>Allowed values</h4>
          <div className="sep-values">
            {field.values.map((value) => (
              <code key={value}>{value}</code>
            ))}
          </div>
        </section>
      )}
      {field.example && (
        <section className="sep-detail-section">
          <h4>Example</h4>
          <pre>{field.example}</pre>
        </section>
      )}
      {field.children && (
        <section className="sep-detail-section sep-child-summary">
          <h4>Object shape</h4>
          <p>{field.children.length} fields</p>
        </section>
      )}
    </article>
  );
}

function FieldRow({
  field,
  selected,
  onSelect,
  prefix,
}: {
  field: Field;
  selected: boolean;
  onSelect: () => void;
  prefix?: React.ReactNode;
}) {
  return (
    <button
      className={`sep-row${selected ? ' sep-row-selected' : ''}`}
      type="button"
      onClick={onSelect}
    >
      <span className="sep-row-name">
        {prefix}
        <code>{field.name}</code>
        {field.required && <span className="sep-required">Required</span>}
        {field.deprecated && (
          <span className="sep-deprecated-dot" title="Deprecated" />
        )}
      </span>
      <span className="sep-row-meta">
        <TypeLabel field={field} />
        {field.children && <Chevron />}
      </span>
    </button>
  );
}

export function VariantA() {
  const [selected, setSelected] = useState<Field>(fields[2]!);
  return (
    <PrototypeFrame
      eyebrow="Variant A"
      title="Flat by default, detail on demand"
      note="Fastest to scan. Objects open separately, so the list never becomes a tree."
    >
      <div className="sep-split sep-split-balanced">
        <section
          className="sep-list-panel"
          aria-label="Transaction category fields"
        >
          <header className="sep-panel-header">
            <div>
              <span className="sep-kicker">Object</span>
              <h2>TransactionCategory</h2>
            </div>
            <span className="sep-count">8 fields</span>
          </header>
          <div className="sep-column-labels">
            <span>Field</span>
            <span>Type</span>
          </div>
          <div className="sep-rows">
            {fields.map((field) => (
              <FieldRow
                key={field.name}
                field={field}
                selected={selected === field}
                onSelect={() => setSelected(field)}
              />
            ))}
          </div>
        </section>
        <aside className="sep-inspector">
          <FieldDetail
            field={selected}
            path={['TransactionCategory', selected.name]}
          />
        </aside>
      </div>
    </PrototypeFrame>
  );
}

export function VariantB() {
  const [path, setPath] = useState<Field[]>([]);
  const currentFields = path.at(-1)?.children ?? fields;
  const [selected, setSelected] = useState<Field>(currentFields[0]!);
  const navigateTo = (field: Field) => {
    if (!field.children) {
      setSelected(field);
      return;
    }
    setPath((current) => [...current, field]);
    setSelected(field.children[0]!);
  };
  const navigateBack = (index: number) => {
    const nextPath = path.slice(0, index);
    setPath(nextPath);
    setSelected((nextPath.at(-1)?.children ?? fields)[0]!);
  };

  return (
    <PrototypeFrame
      eyebrow="Variant B"
      title="Treat nested objects like folders"
      note="Strongest sense of place. Each level stays flat and the breadcrumb carries the hierarchy."
    >
      <div className="sep-navigator">
        <nav className="sep-breadcrumbs" aria-label="Schema path">
          <button type="button" onClick={() => navigateBack(0)}>
            TransactionCategory
          </button>
          {path.map((field, index) => (
            <span key={field.name}>
              <Chevron />
              <button type="button" onClick={() => navigateBack(index + 1)}>
                {field.name}
              </button>
            </span>
          ))}
        </nav>
        <div className="sep-split sep-split-wide-list">
          <section className="sep-folder-panel">
            {path.length > 0 && (
              <button
                className="sep-back-row"
                type="button"
                onClick={() => navigateBack(path.length - 1)}
              >
                <span>←</span> Back to{' '}
                {path.at(-2)?.name ?? 'TransactionCategory'}
              </button>
            )}
            <div className="sep-rows">
              {currentFields.map((field) => (
                <FieldRow
                  key={field.name}
                  field={field}
                  selected={selected === field}
                  onSelect={() => navigateTo(field)}
                  prefix={
                    field.children ? (
                      <span className="sep-object-icon">{'{}'}</span>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </section>
          <aside className="sep-inspector sep-inspector-borderless">
            <FieldDetail
              field={selected}
              path={[
                'TransactionCategory',
                ...path.map((field) => field.name),
                selected.name,
              ]}
            />
          </aside>
        </div>
      </div>
    </PrototypeFrame>
  );
}

function TreeBranch({
  entries,
  depth,
  selected,
  onSelect,
  expanded,
  onToggle,
}: {
  entries: Field[];
  depth: number;
  selected: Field;
  onSelect: (field: Field, path: string[]) => void;
  expanded: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <>
      {entries.map((field) => {
        const key = `${depth}:${field.name}`;
        const isOpen = expanded.has(key);
        return (
          <div key={key}>
            <div
              className={`sep-tree-row${selected === field ? ' sep-tree-row-selected' : ''}`}
              style={{ paddingLeft: 14 + depth * 20 }}
            >
              {field.children ? (
                <button
                  className="sep-tree-toggle"
                  type="button"
                  aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${field.name}`}
                  onClick={() => onToggle(key)}
                >
                  <Chevron direction={isOpen ? 'down' : 'right'} />
                </button>
              ) : (
                <span className="sep-tree-spacer" />
              )}
              <button
                className="sep-tree-select"
                type="button"
                onClick={() => onSelect(field, [field.name])}
              >
                <code>{field.name}</code>
                <TypeLabel field={field} />
              </button>
            </div>
            {field.children && isOpen && (
              <TreeBranch
                entries={field.children}
                depth={depth + 1}
                selected={selected}
                onSelect={(child, childPath) =>
                  onSelect(child, [field.name, ...childPath])
                }
                expanded={expanded}
                onToggle={onToggle}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function VariantC() {
  const merchant = fields.find((field) => field.name === 'merchant')!;
  const location = merchant.children!.find(
    (field) => field.name === 'location',
  )!;
  const [selected, setSelected] = useState<Field>(location.children![1]!);
  const [selectedPath, setSelectedPath] = useState([
    'merchant',
    'location',
    'countryCode',
  ]);
  const [expanded, setExpanded] = useState(
    new Set(['0:merchant', '1:location']),
  );
  const toggle = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  return (
    <PrototypeFrame
      eyebrow="Variant C"
      title="Keep the whole shape in view"
      note="Best for structural exploration. The tree is denser, but it preserves context across deep objects."
    >
      <div className="sep-tree-shell">
        <section
          className="sep-tree-panel"
          aria-label="Transaction category schema tree"
        >
          <header className="sep-tree-header">
            <span className="sep-object-icon">{'{}'}</span>
            <div>
              <h2>TransactionCategory</h2>
              <span>object · 8 fields</span>
            </div>
          </header>
          <div className="sep-tree">
            <TreeBranch
              entries={fields}
              depth={0}
              selected={selected}
              onSelect={(field, path) => {
                setSelected(field);
                setSelectedPath(path);
              }}
              expanded={expanded}
              onToggle={toggle}
            />
          </div>
        </section>
        <aside className="sep-reading-pane">
          <FieldDetail
            field={selected}
            path={['TransactionCategory', ...selectedPath]}
          />
        </aside>
      </div>
    </PrototypeFrame>
  );
}

function PrototypeFrame({
  eyebrow,
  title,
  note,
  children,
}: {
  eyebrow: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <main className="sep-prototype">
      <header className="sep-prototype-header">
        <div>
          <span className="sep-eyebrow">
            {eyebrow} · schema explorer prototype
          </span>
          <h1>{title}</h1>
        </div>
        <p>{note}</p>
      </header>
      {children}
    </main>
  );
}

function PrototypeSwitcher({
  current,
  onChange,
}: {
  current: string;
  onChange: (key: string) => void;
}) {
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  );
  const cycle = (offset: number) => {
    onChange(
      variants[(index + offset + variants.length) % variants.length]!.key,
    );
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches('input, textarea, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft') cycle(-1);
      if (event.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="sep-switcher" role="group" aria-label="Prototype variant">
      <button
        type="button"
        onClick={() => cycle(-1)}
        aria-label="Previous variant"
      >
        ←
      </button>
      <span>
        <strong>{variants[index]!.key}</strong> · {variants[index]!.name}
      </span>
      <button type="button" onClick={() => cycle(1)} aria-label="Next variant">
        →
      </button>
    </div>
  );
}

function Prototype() {
  const initial = new URLSearchParams(window.location.search)
    .get('variant')
    ?.toUpperCase();
  const [variant, setVariant] = useState(
    variants.some((candidate) => candidate.key === initial) ? initial! : 'A',
  );
  const changeVariant = (next: string) => {
    setVariant(next);
    const url = new URL(window.location.href);
    url.searchParams.set('variant', next);
    window.history.replaceState({}, '', url);
  };
  return (
    <>
      {variant === 'A' && <VariantA />}
      {variant === 'B' && <VariantB />}
      {variant === 'C' && <VariantC />}
      <PrototypeSwitcher current={variant} onChange={changeVariant} />
    </>
  );
}

const meta = {
  title: 'Prototypes/Schema field explorer',
  component: Prototype,
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof Prototype>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CompareVariants: Story = {};
