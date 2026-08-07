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
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Markdown } from './Markdown';
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
      <Markdown className="sp-schema-description">{schema.description}</Markdown>
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
            <Markdown>{parameter.description}</Markdown>
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
      <Markdown>{body.description}</Markdown>
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
        <span>Response</span>
        <span className="sp-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="sp-response-body">
          <Markdown>{response.description}</Markdown>
          {media && <><div className="sp-media-type">{media[0]}</div><SchemaView schema={media[1].schema} /></>}
        </div>
      )}
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
        <span className="sp-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="sp-operation-body">
          <div className="sp-operation-main">
            <Markdown>{item.operation.description}</Markdown>
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

function normalizeBasePath(path: string): string {
  if (!path || path === '/') return '';
  return `/${path.replace(/^\/+|\/+$/g, '')}`;
}

function operationHref(basePath: string, operationId: string): string {
  return `${basePath}/${encodeURIComponent(operationId)}` || '/';
}

function NavigationGroup({
  name,
  operations,
  searching,
  basePath,
  activeOperationId,
  onNavigate,
}: {
  name: string;
  operations: OperationModel[];
  searching: boolean;
  basePath: string;
  activeOperationId?: string;
  onNavigate: (operationId?: string) => void;
}) {
  const [open, setOpen] = useState(false);
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
            <a
              className={`sp-nav-operation ${activeOperationId === item.id ? 'is-active' : ''}`}
              href={operationHref(basePath, item.id)}
              aria-current={activeOperationId === item.id ? 'page' : undefined}
              onClick={(event) => { event.preventDefault(); onNavigate(item.id); }}
              key={item.id}
            ><span className="sp-nav-operation-label">{item.operation.summary ?? item.path}</span><span className={`sp-nav-method sp-nav-method-${item.method}`}>{METHOD_LABELS[item.method]}</span></a>
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
  showSidebar = true,
  theme = 'system',
  accentColor = '#6d5dfc',
  logo,
  basePath: basePathProp = '/',
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
  const basePath = normalizeBasePath(basePathProp);
  const operationIdFromPath = () => {
    if (typeof window === 'undefined') return undefined;
    const prefix = `${basePath}/`;
    if (!window.location.pathname.startsWith(prefix)) return undefined;
    const remainder = window.location.pathname.slice(prefix.length);
    return remainder && !remainder.includes('/') ? decodeURIComponent(remainder) : undefined;
  };
  const [activeOperationId, setActiveOperationId] = useState(operationIdFromPath);

  useEffect(() => {
    if (result.error) onError?.(result.error);
  }, [result.error, onError]);

  useEffect(() => {
    const syncRoute = () => setActiveOperationId(operationIdFromPath());
    window.addEventListener('popstate', syncRoute);
    syncRoute();
    return () => window.removeEventListener('popstate', syncRoute);
  }, [basePath]);

  if (result.error || !result.model) return <ErrorState error={result.error ?? new Error('Unknown rendering error.')} />;

  const model = result.model;
  const server = model.document.servers?.[0]?.url ?? '';
  const normalizedQuery = query.trim().toLowerCase();
  const matches = (item: OperationModel) => !normalizedQuery || [item.path, item.method, item.operation.summary, item.operation.operationId, item.tag]
    .some((value) => value?.toLowerCase().includes(normalizedQuery));
  const hasMatchingOperations = model.operations.some(matches);
  const activeOperation = model.operations.find((item) => item.id === activeOperationId);
  const style = { '--sp-accent': accentColor } as CSSProperties;

  function navigate(operationId?: string) {
    const href = operationId ? operationHref(basePath, operationId) : (basePath || '/');
    window.history.pushState({}, '', href);
    setActiveOperationId(operationId);
    const content = document.querySelector<HTMLElement>('.sp-content');
    if (typeof content?.scrollTo === 'function') content.scrollTo({ top: 0 });
  }

  return (
    <div className={`speccy sp-theme-${theme} ${showSidebar ? 'sp-with-sidebar' : ''} ${className}`} style={style}>
      {showSidebar && (
        <nav className="sp-sidebar" aria-label="API reference">
          <a className="sp-brand" href={basePath || '/'} onClick={(event) => { event.preventDefault(); navigate(); }}>{logo ?? <span className="sp-brand-mark">S</span>}<span>{model.document.info?.title ?? 'API reference'}</span></a>
          <div className="sp-search">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search endpoints" aria-label="Search endpoints" />
            {query && <button type="button" className="sp-search-clear" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
          </div>
          <div className="sp-nav-scroll">
            {normalizedQuery && !hasMatchingOperations && (
              <div className="sp-nav-empty" role="status">
                <strong>No endpoints found</strong>
                <span>Try a different search.</span>
              </div>
            )}
            {model.tags.map((tag) => ({ tag, operations: tag.operations.filter(matches) }))
              .filter(({ operations }) => operations.length > 0)
              .map(({ tag, operations }) => (
                <NavigationGroup name={tag.name} operations={operations} searching={Boolean(normalizedQuery)} basePath={basePath} activeOperationId={activeOperation?.id} onNavigate={navigate} key={tag.name} />
              ))}
          </div>
        </nav>
      )}
      <main className="sp-content">
        {!activeOperation && <header className="sp-hero" id="sp-overview">
          <div className="sp-eyebrow">API reference <span>{model.document.info?.version ?? model.document.openapi ?? model.document.swagger}</span></div>
          <h1>{model.document.info?.title ?? 'Untitled API'}</h1>
          <Markdown>{model.document.info?.description}</Markdown>
          {server && <div className="sp-server"><span>Base URL</span><code>{server}</code><CopyButton value={server} /></div>}
        </header>}
        {!activeOperation && model.tags.map((tag) => {
          const visible = tag.operations.filter(matches);
          if (visible.length === 0) return null;
          return (
            <section className="sp-tag" id={`tag-${tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} key={tag.name}>
              <div className="sp-tag-heading"><div><span className="sp-tag-kicker">Resource</span><h2>{tag.name}</h2></div><Markdown>{tag.description}</Markdown></div>
              <div className="sp-operation-list">{visible.map((item) => <a className="sp-operation-link" href={operationHref(basePath, item.id)} onClick={(event) => { event.preventDefault(); navigate(item.id); }} key={item.id}><span className={`sp-method sp-method-${item.method}`}>{METHOD_LABELS[item.method]}</span><code className="sp-path">{item.path}</code><span>{item.operation.summary ?? item.operation.operationId ?? 'Untitled operation'}</span></a>)}</div>
            </section>
          );
        })}
        {activeOperation && <section className="sp-endpoint-page"><button type="button" className="sp-back" onClick={() => navigate()}>← API overview</button><div className="sp-tag-kicker">{activeOperation.tag}</div><OperationCard item={activeOperation} server={server} defaultExpanded /></section>}
        {!activeOperation && normalizedQuery && !hasMatchingOperations && <div className="sp-empty">No endpoints match “{query}”.</div>}
        {!activeOperation && model.operations.length === 0 && <div className="sp-empty">This spec doesn’t contain any operations yet.</div>}
      </main>
    </div>
  );
}
