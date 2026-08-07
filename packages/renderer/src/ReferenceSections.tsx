/**
 * ---
 * purpose: Renders reusable OpenAPI components and webhook operations as browsable reference sections.
 * related:
 *   - ./SchemaView.tsx - Supplies schema, media, and example presentation.
 *   - ./Speccy.tsx - Places these sections in the full API reference.
 * ---
 */

import type { ReactNode } from 'react';
import { Markdown } from './Markdown';
import type { OperationModel } from './model';
import { JsonValue, MediaContent, SchemaView } from './SchemaView';
import type { OpenAPIDocument, SecurityScheme } from './types';
import { useLocalState } from './useLocalState';

export const REFERENCE_GROUPS = [
  ['schemas', 'Schemas'], ['parameters', 'Parameters'], ['requestBodies', 'Request bodies'],
  ['responses', 'Responses'], ['headers', 'Headers'], ['examples', 'Examples'], ['links', 'Links'],
  ['callbacks', 'Callbacks'], ['securitySchemes', 'Security schemes'],
] as const;

export type ReferenceKey = 'webhooks' | typeof REFERENCE_GROUPS[number][0];

function entries(value: unknown): [string, any][] {
  return value && typeof value === 'object' ? Object.entries(value) : [];
}

export function ReferenceNavigation({ document, webhookCount, activeKey, hrefFor, onNavigate, storageKey }: {
  document: OpenAPIDocument;
  webhookCount: number;
  activeKey?: ReferenceKey;
  hrefFor: (key: ReferenceKey) => string;
  onNavigate: (key: ReferenceKey) => void;
  storageKey: string;
}) {
  const [open, setOpen] = useLocalState(storageKey, false);
  const available = REFERENCE_GROUPS.filter(([key]) => entries(document.components?.[key]).length > 0);
  if (available.length === 0 && webhookCount === 0) return null;
  return <div className="sp-nav-group sp-reference-nav">
    <button type="button" className="sp-nav-tag" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span>Reference</span>
      <span className="sp-nav-chevron" aria-hidden="true" />
    </button>
    {open && <div>
      {webhookCount > 0 && <a className={`sp-nav-operation ${activeKey === 'webhooks' ? 'is-active' : ''}`} aria-current={activeKey === 'webhooks' ? 'page' : undefined} href={hrefFor('webhooks')} onClick={(event) => { event.preventDefault(); onNavigate('webhooks'); }}>Webhooks</a>}
      {available.map(([key, label]) => <a className={`sp-nav-operation ${activeKey === key ? 'is-active' : ''}`} aria-current={activeKey === key ? 'page' : undefined} href={hrefFor(key)} onClick={(event) => { event.preventDefault(); onNavigate(key); }} key={key}>{label}</a>)}
    </div>}
  </div>;
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section className="sp-tag sp-reference-section" id={id}><div className="sp-tag-heading"><div><span className="sp-tag-kicker">Reference</span><h2>{title}</h2></div></div>{children}</section>;
}

function Card({ name, children }: { name: string; children: ReactNode }) {
  return <article className="sp-component-card"><h3>{name}</h3>{children}</article>;
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

export function DocumentReference({ document, webhooks, renderOperation, activeKey }: {
  document: OpenAPIDocument;
  webhooks: OperationModel[];
  renderOperation: (operation: OperationModel) => ReactNode;
  activeKey: ReferenceKey;
}) {
  const components = document.components ?? {};
  return <>
    {activeKey === 'webhooks' && webhooks.length > 0 && <Section id="webhooks" title="Webhooks"><div className="sp-operation-list">{webhooks.map((operation) => <div key={operation.id}>{renderOperation(operation)}</div>)}</div></Section>}
    {activeKey === 'schemas' && <Section id="components-schemas" title="Schemas">{entries(components.schemas).map(([name, schema]) => <Card name={name} key={name}><SchemaView schema={schema} /></Card>)}</Section>}
    {activeKey === 'parameters' && <Section id="components-parameters" title="Parameters">{entries(components.parameters).map(([name, parameter]) => <Card name={name} key={name}><div className="sp-schema-head"><code>{parameter.name ?? name}</code><span>{parameter.in}</span>{parameter.required && <span className="sp-required">required</span>}</div><Markdown>{parameter.description}</Markdown><SchemaView schema={parameter.schema} />{parameter.example !== undefined && <JsonValue value={parameter.example} />}</Card>)}</Section>}
    {activeKey === 'requestBodies' && <Section id="components-requestBodies" title="Request bodies">{entries(components.requestBodies).map(([name, body]) => <Card name={name} key={name}><Markdown>{body.description}</Markdown><MediaContent content={body.content} /></Card>)}</Section>}
    {activeKey === 'responses' && <Section id="components-responses" title="Responses">{entries(components.responses).map(([name, response]) => <Card name={name} key={name}><Markdown>{response.description}</Markdown><MediaContent content={response.content} /></Card>)}</Section>}
    {activeKey === 'headers' && <Section id="components-headers" title="Headers">{entries(components.headers).map(([name, header]) => <Card name={name} key={name}><Markdown>{header.description}</Markdown><SchemaView schema={header.schema} /></Card>)}</Section>}
    {activeKey === 'examples' && <Section id="components-examples" title="Examples">{entries(components.examples).map(([name, example]) => <Card name={name} key={name}><Markdown>{example.description}</Markdown><JsonValue value={example.value ?? example.externalValue} /></Card>)}</Section>}
    {activeKey === 'links' && <Section id="components-links" title="Links">{entries(components.links).map(([name, link]) => <Card name={name} key={name}><Markdown>{link.description}</Markdown><p>Operation: <code>{link.operationId ?? link.operationRef ?? 'dynamic'}</code></p>{entries(link.parameters).map(([parameter, value]) => <div key={parameter}><code>{parameter}</code>: <code>{JSON.stringify(value)}</code></div>)}</Card>)}</Section>}
    {activeKey === 'callbacks' && <Section id="components-callbacks" title="Callbacks">{entries(components.callbacks).map(([name, callback]) => <Card name={name} key={name}>{entries(callback).filter(([expression]) => expression !== '$ref').map(([expression, pathItem]) => <div key={expression}><code>{expression}</code><div>{entries(pathItem).filter(([method]) => ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(method)).map(([method, operation]) => <span className="sp-callback-method" key={method}>{method.toUpperCase()} {operation.summary ?? operation.operationId}</span>)}</div></div>)}</Card>)}</Section>}
    {activeKey === 'securitySchemes' && <Section id="components-securitySchemes" title="Security schemes">{entries(components.securitySchemes).map(([name, scheme]) => <Card name={name} key={name}><SecuritySchemeView scheme={scheme} /></Card>)}</Section>}
  </>;
}
