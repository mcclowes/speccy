/**
 * ---
 * purpose: Renders reusable OpenAPI components as browsable reference sections.
 * related:
 *   - ./SchemaView.tsx - Supplies schema, media, and example presentation.
 *   - ./Speccy.tsx - Places these sections in the full API reference.
 * ---
 */

import { type ReactNode, useEffect, useState } from 'react';
import { Markdown } from './Markdown';
import { JsonValue, MediaContent, SchemaView } from './SchemaView';
import type { OpenAPIDocument, SecurityScheme } from '@speccy/core';
import { useLocalState } from './useLocalState';

export const REFERENCE_GROUPS = [
  ['schemas', 'Schemas'], ['parameters', 'Parameters'], ['requestBodies', 'Request bodies'],
  ['responses', 'Responses'], ['headers', 'Headers'], ['examples', 'Examples'], ['links', 'Links'],
  ['callbacks', 'Callbacks'], ['securitySchemes', 'Security schemes'],
] as const;

export type ReferenceKey = typeof REFERENCE_GROUPS[number][0];

function entries(value: unknown): [string, any][] {
  return value && typeof value === 'object' ? Object.entries(value) : [];
}

export function ReferenceNavigation({ document, activeKey, hrefFor, onNavigate, storageKey }: {
  document: OpenAPIDocument;
  activeKey?: ReferenceKey;
  hrefFor: (key: ReferenceKey) => string;
  onNavigate: (key: ReferenceKey) => void;
  storageKey: string;
}) {
  const [open, setOpen] = useLocalState(storageKey, false);
  const available = REFERENCE_GROUPS.filter(([key]) => entries(document.components?.[key]).length > 0);
  if (available.length === 0) return null;
  return <div className="sp-nav-group sp-reference-nav">
    <button type="button" className="sp-nav-tag" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span>Reference</span>
      <span className="sp-nav-chevron" aria-hidden="true" />
    </button>
    {open && <div>
      {available.map(([key, label]) => <a className={`sp-nav-operation ${activeKey === key ? 'is-active' : ''}`} aria-current={activeKey === key ? 'page' : undefined} href={hrefFor(key)} onClick={(event) => { event.preventDefault(); onNavigate(key); }} key={key}>{label}</a>)}
    </div>}
  </div>;
}

export function componentAnchorId(key: ReferenceKey, name: string): string {
  const slug = name.trim().replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `component-${key}-${slug || encodeURIComponent(name)}`;
}

function Section({ id, title, activeKey, names, children }: { id: string; title: string; activeKey: ReferenceKey; names: string[]; children: ReactNode }) {
  const [activeId, setActiveId] = useState(() => names[0] ? componentAnchorId(activeKey, names[0]) : '');

  useEffect(() => {
    const ids = names.map((name) => componentAnchorId(activeKey, name));
    const hashId = ids.find((item) => item === window.location.hash.slice(1));
    setActiveId(hashId ?? ids[0] ?? '');
    if (hashId) requestAnimationFrame(() => document.getElementById(hashId)?.scrollIntoView?.({ block: 'start' }));
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((observations) => {
      const visible = observations.filter((item) => item.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
      if (visible) setActiveId(visible.target.id);
    }, { rootMargin: '-10% 0px -75% 0px' });
    ids.forEach((item) => {
      const element = document.getElementById(item);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [activeKey, names.join('\u0000')]);

  function jumpTo(id: string) {
    if (!id) return;
    window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  }

  return <section className="sp-tag sp-reference-section" id={id}>
    <div className="sp-tag-heading"><div><span className="sp-tag-kicker">Reference</span><h2>{title}</h2></div></div>
    {names.length > 1 && <label className="sp-reference-jump"><span>Jump to {title.toLowerCase()}</span><select value={activeId} onChange={(event) => jumpTo(event.target.value)}>{names.map((name) => <option value={componentAnchorId(activeKey, name)} key={name}>{name}</option>)}</select></label>}
    <div className="sp-reference-layout">
      <div className="sp-reference-cards">{children}</div>
      {names.length > 1 && <nav className="sp-reference-toc" aria-label={`${title} on this page`}><strong>On this page</strong><div>{names.map((name) => {
        const anchor = componentAnchorId(activeKey, name);
        return <a className={activeId === anchor ? 'is-active' : ''} aria-current={activeId === anchor ? 'location' : undefined} href={`#${anchor}`} onClick={(event) => { event.preventDefault(); jumpTo(anchor); }} key={name}>{name}</a>;
      })}</div></nav>}
    </div>
  </section>;
}

function Card({ id, name, children }: { id: string; name: string; children: ReactNode }) {
  return <article className="sp-component-card" id={id}><h3>{name}</h3>{children}</article>;
}

function SecuritySchemeView({ scheme }: { scheme: SecurityScheme }) {
  const flows = scheme.flows ?? (scheme.flow ? { [scheme.flow]: { authorizationUrl: scheme.authorizationUrl, tokenUrl: scheme.tokenUrl, scopes: scheme.scopes } } : undefined);
  return <><div className="sp-schema-head"><span className="sp-type">{scheme.type ?? 'unknown'}</span>{scheme.scheme && <code>{scheme.scheme}</code>}{scheme.in && <span>{scheme.in}: <code>{scheme.name}</code></span>}</div>
    <Markdown>{scheme.description}</Markdown>
    {scheme.bearerFormat && <p>Bearer format: <code>{scheme.bearerFormat}</code></p>}
    {scheme.openIdConnectUrl && <p>OpenID Connect: <a href={scheme.openIdConnectUrl}>{scheme.openIdConnectUrl}</a></p>}
    {flows && entries(flows).map(([name, flow]) => <div className="sp-auth-flow" key={name}><strong>{name}</strong>{flow.authorizationUrl && <p>Authorization URL: <code>{flow.authorizationUrl}</code></p>}{flow.tokenUrl && <p>Token URL: <code>{flow.tokenUrl}</code></p>}{entries(flow.scopes).map(([scope, description]) => <div key={scope}><code>{scope}</code> — {description}</div>)}</div>)}
  </>;
}

export function DocumentReference({ document, activeKey }: {
  document: OpenAPIDocument;
  activeKey: ReferenceKey;
}) {
  const components = document.components ?? {};
  const renderCards = (key: ReferenceKey, render: (name: string, value: any) => ReactNode) => {
    const items = entries(components[key]);
    return <Section id={`components-${key}`} title={REFERENCE_GROUPS.find(([item]) => item === key)?.[1] ?? key} activeKey={key} names={items.map(([name]) => name)}>{items.map(([name, value]) => <Card id={componentAnchorId(key, name)} name={name} key={name}>{render(name, value)}</Card>)}</Section>;
  };
  return <>
    {activeKey === 'schemas' && renderCards('schemas', (_name, schema) => <SchemaView schema={schema} />)}
    {activeKey === 'parameters' && renderCards('parameters', (name, parameter) => <><div className="sp-schema-head"><code>{parameter.name ?? name}</code><span>{parameter.in}</span>{parameter.required && <span className="sp-required" title="Required">*</span>}</div><Markdown>{parameter.description}</Markdown><SchemaView schema={parameter.schema} />{parameter.example !== undefined && <JsonValue value={parameter.example} />}</>)}
    {activeKey === 'requestBodies' && renderCards('requestBodies', (_name, body) => <><Markdown>{body.description}</Markdown><MediaContent content={body.content} /></>)}
    {activeKey === 'responses' && renderCards('responses', (_name, response) => <><Markdown>{response.description}</Markdown><MediaContent content={response.content} /></>)}
    {activeKey === 'headers' && renderCards('headers', (_name, header) => <><Markdown>{header.description}</Markdown><SchemaView schema={header.schema} /></>)}
    {activeKey === 'examples' && renderCards('examples', (_name, example) => <><Markdown>{example.description}</Markdown><JsonValue value={example.value ?? example.externalValue} /></>)}
    {activeKey === 'links' && renderCards('links', (_name, link) => <><Markdown>{link.description}</Markdown><p>Operation: <code>{link.operationId ?? link.operationRef ?? 'dynamic'}</code></p>{entries(link.parameters).map(([parameter, value]) => <div key={parameter}><code>{parameter}</code>: <code>{JSON.stringify(value)}</code></div>)}</>)}
    {activeKey === 'callbacks' && renderCards('callbacks', (_name, callback) => <>{entries(callback).filter(([expression]) => expression !== '$ref').map(([expression, pathItem]) => <div key={expression}><code>{expression}</code><div>{entries(pathItem).filter(([method]) => ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(method)).map(([method, operation]) => <span className="sp-callback-method" key={method}>{method.toUpperCase()} {operation.summary ?? operation.operationId}</span>)}</div></div>)}</>)}
    {activeKey === 'securitySchemes' && renderCards('securitySchemes', (_name, scheme) => <SecuritySchemeView scheme={scheme} />)}
  </>;
}
