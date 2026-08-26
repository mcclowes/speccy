/**
 * ---
 * purpose: Small presentational pieces shared by every page that lists or heads an operation.
 * related:
 *   - ./Speccy.tsx - Composes the pages that use these pieces.
 *   - ./EndpointPage.tsx - Uses the title and badges in the endpoint header.
 *   - ./SidebarNavigation.tsx - Uses the compact badge in navigation links.
 * ---
 */

import {
  slugify,
  type OperationModel,
  type ServerObject,
  type TagModel,
} from 'speccy-core';
import { ApiPath, MethodBadge } from './DesignSystem';
import type { SpeccyRoute } from './types';

export function operationTitle(item: OperationModel): string {
  return (
    item.operation.summary ??
    item.operation.operationId ??
    (item.source === 'webhook' ? item.path : 'Untitled operation')
  );
}

export function tagSlug(tag: TagModel): string {
  return slugify(tag.name) || tag.name;
}

export function hasUrl(
  server: ServerObject,
): server is ServerObject & { url: string } {
  return Boolean(server.url);
}

export function OperationBadge({
  item,
  compact = false,
}: {
  item: OperationModel;
  compact?: boolean;
}) {
  return (
    <MethodBadge
      method={item.method}
      compact={compact}
      webhook={item.source === 'webhook'}
    />
  );
}

function operationLifecycle(item: OperationModel): string | undefined {
  const lifecycle = item.operation['x-speccy-lifecycle'];
  if (typeof lifecycle !== 'string') return undefined;
  const trimmed = lifecycle.trim();
  return trimmed || undefined;
}

export function LifecycleBadge({ item }: { item: OperationModel }) {
  const lifecycle = operationLifecycle(item);
  if (!lifecycle) return null;

  const normalized = lifecycle.toLocaleLowerCase().replace(/[\s_]+/g, '-');
  const label = normalized
    .split('-')
    .filter(Boolean)
    .map((word) => word[0]?.toLocaleUpperCase() + word.slice(1))
    .join(' ');
  const variant = ['new', 'coming-soon', 'beta'].includes(normalized)
    ? normalized
    : 'custom';

  return (
    <span className={`sp-lifecycle sp-lifecycle-${variant}`}>{label}</span>
  );
}

export function TagIcon({ tag }: { tag: TagModel }) {
  if (!tag.icon) return null;
  return (
    <img className="sp-tag-icon" src={tag.icon.url} alt={tag.icon.alt ?? ''} />
  );
}

export function ExternalDocsLink({
  docs,
}: {
  docs?: { url?: string; description?: string };
}) {
  if (!docs?.url) return null;
  return <a href={docs.url}>{docs.description ?? 'External documentation'}</a>;
}

export function OperationLink({
  item,
  onNavigate,
  hrefForRoute,
}: {
  item: OperationModel;
  onNavigate: (operationId: string) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
}) {
  return (
    <a
      className="sp-operation-link"
      href={hrefForRoute({ page: 'operation', operationId: item.id })}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(item.id);
      }}
    >
      <span className="sp-operation-link-summary">{operationTitle(item)}</span>
      <span className="sp-operation-link-address">
        <OperationBadge item={item} />
        <ApiPath value={item.path} />
      </span>
    </a>
  );
}
