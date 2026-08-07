/**
 * ---
 * purpose: Renders a complete, searchable OpenAPI reference from the normalized model.
 * related:
 *   - ./model.ts - Parses input and builds tag and operation groups.
 *   - ./styles.css - Owns the visual system and responsive layout.
 *   - ./types.ts - Declares the public component API.
 * ---
 */

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createReferenceModel, parseSpec, type OperationModel } from './model';
import type {
  MediaType,
  Parameter,
  ResponseObject,
  SchemaObject,
  SpeccyProps,
} from './types';

const METHOD_LABELS: Record<string, string> = {
  get: 'GET', post: 'POST', put: 'PUT', patch: 'PATCH', delete: 'DELETE',
  options: 'OPTIONS', head: 'HEAD', trace: 'TRACE',
};

function RichText({ children, className = '' }: { children?: string; className?: string }) {
  if (!children) return null;
  return (
    <div className={`sp-richtext ${className}`}>
      {children.split(/\n\s*\n/).map((paragraph, index) => (
        <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>
      ))}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return <button className="sp-copy" type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>;
}

function schemaLabel(schema?: SchemaObject): string {
  if (!schema) return 'any';
  if (schema.$ref) return schema.$ref.split('/').pop() ?? 'reference';
  if (schema.type === 'array') return `array<${schemaLabel(schema.items)}>`;
  if (schema.enum) return schema.enum.map(String).join(' | ');
  return [schema.type ?? 'object', schema.format].filter(Boolean).join(' · ');
}

function SchemaView({ schema, name, required = false, depth = 0 }: {
  schema?: SchemaObject;
  name?: string;
  required?: boolean;
  depth?: number;
}) {
  if (!schema) return null;
  const properties = schema.properties ?? {};
  const variants = schema.oneOf ?? schema.anyOf ?? schema.allOf;

  return (
    <div className={`sp-schema sp-schema-depth-${Math.min(depth, 3)}`}>
      <div className="sp-schema-head">
        {name && <code className="sp-property">{name}</code>}
        <span className="sp-type">{schemaLabel(schema)}</span>
        {required && <span className="sp-required">required</span>}
        {schema.nullable && <span className="sp-qualifier">nullable</span>}
        {schema.readOnly && <span className="sp-qualifier">read only</span>}
      </div>
      {schema.description && <p className="sp-schema-description">{schema.description}</p>}
      {schema.default !== undefined && <p className="sp-schema-meta">Default: <code>{JSON.stringify(schema.default)}</code></p>}
      {schema.example !== undefined && <p className="sp-schema-meta">Example: <code>{JSON.stringify(schema.example)}</code></p>}
      {Object.entries(properties).length > 0 && (
        <div className="sp-schema-properties">
          {Object.entries(properties).map(([propertyName, property]) => (
            <SchemaView
              key={propertyName}
              name={propertyName}
              schema={property}
              required={schema.required?.includes(propertyName)}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
      {schema.items && depth < 4 && <SchemaView name="items" schema={schema.items} depth={depth + 1} />}
      {variants && (
        <div className="sp-schema-properties">
          {variants.map((variant, index) => <SchemaView key={index} name={`option ${index + 1}`} schema={variant} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

function ParameterList({ parameters }: { parameters: Parameter[] }) {
  if (parameters.length === 0) return null;
  return (
    <section className="sp-section">
      <h4>Parameters</h4>
      <div className="sp-parameter-list">
        {parameters.map((parameter, index) => (
          <div className="sp-parameter" key={`${parameter.in}-${parameter.name}-${index}`}>
            <div className="sp-parameter-name">
              <code>{parameter.name ?? 'unnamed'}</code>
              <span>{parameter.in ?? 'query'}</span>
              {parameter.required && <span className="sp-required">required</span>}
            </div>
            {parameter.description && <p>{parameter.description}</p>}
            <SchemaView schema={parameter.schema} />
          </div>
        ))}
      </div>
    </section>
  );
}

function firstMedia(content?: Record<string, MediaType>): [string, MediaType] | undefined {
  return content ? Object.entries(content)[0] : undefined;
}

function RequestBodyView({ operation }: { operation: OperationModel['operation'] }) {
  const body = operation.requestBody;
  if (!body) return null;
  const media = firstMedia(body.content);
  return (
    <section className="sp-section">
      <h4>Request body {body.required && <span className="sp-required">required</span>}</h4>
      {body.description && <p>{body.description}</p>}
      {media && <><div className="sp-media-type">{media[0]}</div><SchemaView schema={media[1].schema} /></>}
    </section>
  );
}

function ResponseView({ code, response }: { code: string; response: ResponseObject }) {
  const [open, setOpen] = useState(code.startsWith('2'));
  const media = firstMedia(response.content);
  return (
    <div className="sp-response">
      <button type="button" className="sp-response-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={`sp-status ${code.startsWith('2') ? 'is-success' : ''}`}>{code}</span>
        <span>{response.description ?? 'Response'}</span>
        <span className="sp-chevron">{open ? '−' : '+'}</span>
      </button>
      {open && media && <div className="sp-response-body"><div className="sp-media-type">{media[0]}</div><SchemaView schema={media[1].schema} /></div>}
    </div>
  );
}

function CodeSample({ item, server }: { item: OperationModel; server: string }) {
  const url = `${server.replace(/\/$/, '')}${item.path}`;
  const contentType = firstMedia(item.operation.requestBody?.content)?.[0];
  const lines = [`curl --request ${METHOD_LABELS[item.method]} \\`, `  --url '${url}'`];
  if (contentType) lines.push(`  --header 'content-type: ${contentType}'`);
  const sample = lines.join(' \\\n');
  return (
    <aside className="sp-code-panel">
      <div className="sp-code-title"><span>cURL</span><CopyButton value={sample} /></div>
      <pre><code>{sample}</code></pre>
    </aside>
  );
}

function OperationCard({ item, server, defaultExpanded }: {
  item: OperationModel;
  server: string;
  defaultExpanded: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  const parameters = [...(item.pathItem.parameters ?? []), ...(item.operation.parameters ?? [])];
  return (
    <article id={item.id} className={`sp-operation sp-method-${item.method}`}>
      <button type="button" className="sp-operation-summary" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="sp-method">{METHOD_LABELS[item.method]}</span>
        <code className="sp-path">{item.path}</code>
        <span className="sp-operation-name">{item.operation.summary ?? item.operation.operationId ?? 'Untitled operation'}</span>
        {item.operation.deprecated && <span className="sp-deprecated">deprecated</span>}
        <span className="sp-chevron">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="sp-operation-body">
          <div className="sp-operation-main">
            <RichText>{item.operation.description}</RichText>
            <ParameterList parameters={parameters} />
            <RequestBodyView operation={item.operation} />
            {item.operation.responses && (
              <section className="sp-section">
                <h4>Responses</h4>
                <div className="sp-responses">
                  {Object.entries(item.operation.responses).map(([code, response]) => <ResponseView key={code} code={code} response={response} />)}
                </div>
              </section>
            )}
          </div>
          <CodeSample item={item} server={server} />
        </div>
      )}
    </article>
  );
}

function NavigationGroup({
  name,
  operations,
  searching,
}: {
  name: string;
  operations: OperationModel[];
  searching: boolean;
}) {
  const [open, setOpen] = useState(true);
  const expanded = searching || open;
  const operationListId = `sp-nav-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <div className="sp-nav-group">
      <button
        type="button"
        className="sp-nav-tag"
        onClick={() => setOpen(!expanded)}
        aria-expanded={expanded}
        aria-controls={operationListId}
      >
        <span>{name}</span>
        <span className="sp-nav-chevron" aria-hidden="true" />
      </button>
      {expanded && (
        <div id={operationListId}>
          {operations.map((item) => (
            <a className="sp-nav-operation" href={`#${item.id}`} key={item.id}><span className={`sp-nav-method sp-nav-method-${item.method}`}>{METHOD_LABELS[item.method]}</span><span>{item.operation.summary ?? item.path}</span></a>
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  return <div className="sp-error" role="alert"><strong>Couldn’t render this spec</strong><p>{error.message}</p></div>;
}

export function Speccy({
  spec,
  className = '',
  defaultExpanded = false,
  showSidebar = true,
  theme = 'system',
  accentColor = '#6d5dfc',
  logo,
  onError,
}: SpeccyProps) {
  const result = useMemo(() => {
    try {
      return { model: createReferenceModel(parseSpec(spec)) };
    } catch (cause) {
      return { error: cause instanceof Error ? cause : new Error('Unable to parse the OpenAPI document.') };
    }
  }, [spec]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (result.error) onError?.(result.error);
  }, [result.error, onError]);

  if (result.error || !result.model) return <ErrorState error={result.error ?? new Error('Unknown rendering error.')} />;

  const model = result.model;
  const server = model.document.servers?.[0]?.url ?? '';
  const normalizedQuery = query.trim().toLowerCase();
  const matches = (item: OperationModel) => !normalizedQuery || [item.path, item.method, item.operation.summary, item.operation.operationId, item.tag]
    .some((value) => value?.toLowerCase().includes(normalizedQuery));
  const style = { '--sp-accent': accentColor } as CSSProperties;

  return (
    <div className={`speccy sp-theme-${theme} ${showSidebar ? 'sp-with-sidebar' : ''} ${className}`} style={style}>
      {showSidebar && (
        <nav className="sp-sidebar" aria-label="API reference">
          <a className="sp-brand" href="#sp-overview">{logo ?? <span className="sp-brand-mark">S</span>}<span>{model.document.info?.title ?? 'API reference'}</span></a>
          <div className="sp-search">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search endpoints" aria-label="Search endpoints" />
            {query && <button type="button" className="sp-search-clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
          </div>
          <div className="sp-nav-scroll">
            {model.tags.map((tag) => ({ tag, operations: tag.operations.filter(matches) }))
              .filter(({ operations }) => operations.length > 0)
              .map(({ tag, operations }) => (
                <NavigationGroup name={tag.name} operations={operations} searching={Boolean(normalizedQuery)} key={tag.name} />
              ))}
          </div>
        </nav>
      )}
      <main className="sp-content">
        <header className="sp-hero" id="sp-overview">
          <div className="sp-eyebrow">API reference <span>{model.document.info?.version ?? model.document.openapi ?? model.document.swagger}</span></div>
          <h1>{model.document.info?.title ?? 'Untitled API'}</h1>
          <RichText>{model.document.info?.description}</RichText>
          {server && <div className="sp-server"><span>Base URL</span><code>{server}</code><CopyButton value={server} /></div>}
        </header>
        {model.tags.map((tag) => {
          const visible = tag.operations.filter(matches);
          if (visible.length === 0) return null;
          return (
            <section className="sp-tag" id={`tag-${tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} key={tag.name}>
              <div className="sp-tag-heading"><div><span className="sp-tag-kicker">Resource</span><h2>{tag.name}</h2></div><RichText>{tag.description}</RichText></div>
              <div className="sp-operation-list">{visible.map((item) => <OperationCard item={item} server={server} defaultExpanded={defaultExpanded} key={item.id} />)}</div>
            </section>
          );
        })}
        {normalizedQuery && model.operations.every((item) => !matches(item)) && <div className="sp-empty">No endpoints match “{query}”.</div>}
        {model.operations.length === 0 && <div className="sp-empty">This spec doesn’t contain any operations yet.</div>}
      </main>
    </div>
  );
}
