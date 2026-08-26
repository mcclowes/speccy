/**
 * ---
 * purpose: Renders the API overview: hero, metadata, servers, security, and one section per tag.
 * related:
 *   - ./Speccy.tsx - Mounts this page when no operation, tag, or reference is active.
 *   - ./OpenApiDownload.tsx - Owns the spec download control in the hero aside.
 *   - ./operationSummary.tsx - Shared operation links and tag icon.
 * ---
 */

import type { ReactNode } from 'react';
import {
  expandServerUrl,
  type ApiDiagnostic,
  type createReferenceModel,
  type OpenAPIDocument,
  type ServerObject,
  type TagModel,
} from 'speccy-core';
import { CopyButton } from './CodeBlock';
import { InlineDiagnostics } from './DeveloperDiagnostics';
import { Markdown } from './Markdown';
import { OpenApiDownload } from './OpenApiDownload';
import { SecurityRequirements } from './OperationDetails';
import {
  ExternalDocsLink,
  hasUrl,
  OperationLink,
  TagIcon,
} from './operationSummary';
import type { SpeccyRoute } from './types';

type ReferenceModel = ReturnType<typeof createReferenceModel>;
type ApiInfo = NonNullable<OpenAPIDocument['info']>;

export function OverviewPage({
  model,
  showApiVersion,
  diagnostics,
  onViewAllDiagnostics,
  openApiUrl,
  postmanCollectionUrl,
  onNavigate,
  hrefForRoute,
}: {
  model: ReferenceModel;
  showApiVersion: boolean;
  diagnostics: ApiDiagnostic[];
  onViewAllDiagnostics: () => void;
  openApiUrl?: string;
  postmanCollectionUrl?: string;
  onNavigate: (operationId: string) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
}) {
  const { document } = model;
  const info = document.info;
  const hasOperations =
    model.operations.length > 0 || model.webhooks.length > 0;
  return (
    <>
      <header className="sp-hero" id="sp-overview">
        <div className="sp-hero-intro">
          <div className="sp-eyebrow">
            API reference
            {showApiVersion && (
              <>
                {' '}
                <span>
                  {info?.version ?? document.openapi ?? document.swagger}
                </span>
              </>
            )}
          </div>
          <h1>{info?.title ?? 'Untitled API'}</h1>
          <Markdown>{info?.summary}</Markdown>
          <Markdown>{info?.description}</Markdown>
          <ApiMeta info={info} externalDocs={document.externalDocs} />
          <InlineDiagnostics
            diagnostics={diagnostics.filter(
              (diagnostic) => !diagnostic.operationId && !diagnostic.tag,
            )}
            onViewAll={onViewAllDiagnostics}
          />
        </div>
        <aside className="sp-hero-aside">
          <OpenApiDownload
            document={document}
            openApiUrl={openApiUrl}
            postmanCollectionUrl={postmanCollectionUrl}
          />
          {(document.servers ?? []).filter(hasUrl).map((server, index) => (
            <ServerCard server={server} key={`${server.url}-${index}`} />
          ))}
          <SecurityRequirements
            requirements={document.security}
            schemes={document.components?.securitySchemes}
          />
        </aside>
      </header>
      {model.tags.map((tag) => (
        <TagSection
          tag={tag}
          onNavigate={onNavigate}
          hrefForRoute={hrefForRoute}
          key={tag.name}
        />
      ))}
      {!hasOperations && (
        <div className="sp-empty">
          This spec doesn’t contain any operations yet.
        </div>
      )}
    </>
  );
}

function ApiMeta({
  info,
  externalDocs,
}: {
  info?: ApiInfo;
  externalDocs?: OpenAPIDocument['externalDocs'];
}) {
  const items: Array<{ label: string; value: ReactNode }> = [];
  if (info?.termsOfService)
    items.push({
      label: 'Terms',
      value: <a href={info.termsOfService}>Terms of service</a>,
    });
  if (info?.contact)
    items.push({
      label: 'Contact',
      value: <ContactValue contact={info.contact} />,
    });
  if (info?.license)
    items.push({
      label: 'License',
      value: <LicenseValue license={info.license} />,
    });
  if (externalDocs?.url)
    items.push({
      label: 'Documentation',
      value: <ExternalDocsLink docs={externalDocs} />,
    });
  if (items.length === 0) return null;

  return (
    <dl className="sp-api-meta" aria-label="API information">
      {items.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ContactValue({
  contact,
}: {
  contact: NonNullable<ApiInfo['contact']>;
}) {
  return (
    <>
      {contact.url ? (
        <a href={contact.url}>{contact.name ?? contact.url}</a>
      ) : (
        contact.name
      )}
      {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
    </>
  );
}

function LicenseValue({
  license,
}: {
  license: NonNullable<ApiInfo['license']>;
}) {
  const label = license.identifier ?? license.name;
  return license.url ? <a href={license.url}>{label}</a> : <span>{label}</span>;
}

function ServerCard({ server }: { server: ServerObject & { url: string } }) {
  const url = expandServerUrl(server.url, server.variables);
  return (
    <div className="sp-server">
      <span>{server.description ?? 'Base URL'}</span>
      <code>{url}</code>
      <CopyButton value={url} />
      {Object.entries(server.variables ?? {}).map(([name, variable]) => (
        <small key={name}>
          <code>{name}</code>
          {variable.enum && ` (${variable.enum.join(', ')})`}
          {variable.description && `: ${variable.description}`}
        </small>
      ))}
    </div>
  );
}

function TagSection({
  tag,
  onNavigate,
  hrefForRoute,
}: {
  tag: TagModel;
  onNavigate: (operationId: string) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
}) {
  if (tag.operations.length === 0) return null;
  return (
    <section
      className="sp-tag"
      id={`tag-${tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
    >
      <div className="sp-tag-heading">
        <div>
          <span className="sp-tag-kicker">Resource</span>
          <h2 className="sp-tag-title">
            <TagIcon tag={tag} />
            {tag.name}
          </h2>
        </div>
        <Markdown>{tag.description}</Markdown>
      </div>
      <div className="sp-operation-list">
        {tag.operations.map((item) => (
          <OperationLink
            item={item}
            onNavigate={onNavigate}
            hrefForRoute={hrefForRoute}
            key={item.id}
          />
        ))}
      </div>
    </section>
  );
}
