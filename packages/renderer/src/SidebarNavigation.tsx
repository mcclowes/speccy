/**
 * ---
 * purpose: Renders the reference sidebar: brand, tag groups, endpoint filter, and reference links.
 * related:
 *   - ./Speccy.tsx - Mounts the sidebar and owns the active route.
 *   - ./ReferenceSections.tsx - Owns the reference (components) navigation block.
 *   - ./operationSummary.tsx - Shared badges used in navigation links.
 * ---
 */

import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  slugify,
  type createReferenceModel,
  type OperationModel,
  type TagModel,
} from 'speccy-core';
import { DisclosureChevron, DisclosureContent } from './DesignSystem';
import { ReferenceNavigation, type ReferenceKey } from './ReferenceSections';
import {
  LifecycleBadge,
  OperationBadge,
  TagIcon,
  tagSlug,
} from './operationSummary';
import type { SpeccyRoute } from './types';
import { useLocalState } from './useLocalState';

type ReferenceModel = ReturnType<typeof createReferenceModel>;

function scrollWithinContainer(
  container: HTMLElement,
  element: HTMLElement,
): void {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  if (elementRect.top < containerRect.top)
    container.scrollTop -= containerRect.top - elementRect.top;
  else if (elementRect.bottom > containerRect.bottom)
    container.scrollTop += elementRect.bottom - containerRect.bottom;
}

export function SidebarNavigation({
  model,
  title,
  brandLogo,
  singleExpanded,
  activeRoute,
  activeTag,
  activeOperationId,
  activeReference,
  mobileOpen,
  onMobileOpenChange,
  onNavigate,
  onNavigateTag,
  onNavigateReference,
  hrefForRoute,
  storageScope,
}: {
  model: ReferenceModel;
  title: string;
  brandLogo: ReactNode;
  singleExpanded: boolean;
  activeRoute?: string;
  activeTag?: TagModel;
  activeOperationId?: string;
  activeReference?: ReferenceKey;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onNavigate: (operationId?: string) => void;
  onNavigateTag: (tag: TagModel) => void;
  onNavigateReference: (key: ReferenceKey, component?: string) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
  storageScope: string;
}) {
  const [filterQuery, setFilterQuery] = useState('');
  const [openTag, setOpenTag] = useState<string | null>(null);
  const normalizedFilter = filterQuery.trim().toLowerCase();
  const searching = Boolean(normalizedFilter);
  const matchesFilter = (item: OperationModel) =>
    !searching ||
    [
      item.path,
      item.method,
      item.operation.summary,
      item.operation.operationId,
      item.tag,
      item.source,
    ].some((value) => value?.toLowerCase().includes(normalizedFilter));
  const noMatches =
    searching && ![...model.operations, ...model.webhooks].some(matchesFilter);
  const groupedTagNames = new Set(
    model.tagGroups.flatMap((group) => group.tags.map((tag) => tag.name)),
  );
  const ungroupedTags = model.tags.filter(
    (tag) => !groupedTagNames.has(tag.name),
  );
  const openClass = mobileOpen ? 'is-open' : '';
  const overviewHref = hrefForRoute({ page: 'overview' });
  const goToOverview = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    onNavigate();
  };
  const tagProps = {
    matches: matchesFilter,
    searching,
    singleExpanded,
    openTag,
    onOpenTagChange: setOpenTag,
    activeTag,
    activeOperationId,
    onNavigate,
    onNavigateTag,
    hrefForRoute,
    storageScope,
  };

  return (
    <>
      <header className="sp-mobile-header">
        <span>{title}</span>
        <button
          type="button"
          className="sp-mobile-nav-toggle"
          aria-expanded={mobileOpen}
          aria-controls="sp-sidebar-navigation"
          aria-label="Open navigation"
          onClick={() => onMobileOpenChange(true)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>
      <button
        type="button"
        className={`sp-mobile-nav-backdrop ${openClass}`}
        aria-label="Close navigation"
        onClick={() => onMobileOpenChange(false)}
      />
      <nav
        id="sp-sidebar-navigation"
        className={`sp-sidebar ${openClass}`}
        aria-label="API reference"
      >
        <a
          className={brandLogo ? 'sp-brand has-logo' : 'sp-brand'}
          href={overviewHref}
          onClick={goToOverview}
        >
          {brandLogo}
          <span>{title}</span>
        </a>
        <div className="sp-nav-scroll">
          <a
            className={`sp-nav-operation sp-nav-overview ${!activeRoute ? 'is-active' : ''}`}
            href={overviewHref}
            aria-current={!activeRoute ? 'page' : undefined}
            onClick={goToOverview}
          >
            All operations
          </a>
          {model.tagGroups.map((group) => {
            const visibleTags = group.tags.filter((tag) =>
              tag.operations.some(matchesFilter),
            );
            if (visibleTags.length === 0) return null;
            const headingId = `sp-nav-tag-group-${slugify(group.name)}`;
            return (
              <section
                className="sp-nav-tag-group"
                aria-labelledby={headingId}
                key={group.name}
              >
                <h2 className="sp-nav-heading" id={headingId}>
                  {group.name}
                </h2>
                <NavigationTags tags={visibleTags} {...tagProps} />
              </section>
            );
          })}
          <NavigationTags tags={ungroupedTags} {...tagProps} />
          {noMatches && (
            <div className="sp-nav-empty">
              <strong>No matching endpoints</strong>
              <span>Try a path, method, or operation name.</span>
            </div>
          )}
          {!searching && (
            <ReferenceNavigation
              document={model.document}
              activeKey={activeReference}
              storageKey={`${storageScope}:navigation:reference`}
              hrefFor={(key) =>
                hrefForRoute({ page: 'reference', section: key })
              }
              onNavigate={onNavigateReference}
            />
          )}
        </div>
        <div className="sp-sidebar-search">
          <svg
            className="sp-filter-icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder="Filter endpoints"
            aria-label="Filter endpoints"
          />
          {filterQuery && (
            <button
              type="button"
              className="sp-search-clear"
              onClick={() => setFilterQuery('')}
              aria-label="Clear filter"
            >
              ×
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

function NavigationTags({
  tags,
  matches,
  searching,
  singleExpanded,
  openTag,
  onOpenTagChange,
  activeTag,
  activeOperationId,
  onNavigate,
  onNavigateTag,
  hrefForRoute,
  storageScope,
}: {
  tags: TagModel[];
  matches: (item: OperationModel) => boolean;
  searching: boolean;
  singleExpanded: boolean;
  openTag: string | null;
  onOpenTagChange: (tag: string | null) => void;
  activeTag?: TagModel;
  activeOperationId?: string;
  onNavigate: (operationId?: string) => void;
  onNavigateTag: (tag: TagModel) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
  storageScope: string;
}) {
  return (
    <>
      {tags
        .map((tag) => ({ tag, operations: tag.operations.filter(matches) }))
        .filter(({ operations }) => operations.length > 0)
        .map(({ tag, operations }) => (
          <NavigationGroup
            tag={tag}
            operations={operations}
            searching={searching}
            singleExpanded={singleExpanded}
            open={openTag === tag.name}
            onOpenChange={(open) => onOpenTagChange(open ? tag.name : null)}
            activeTag={activeTag}
            activeOperationId={activeOperationId}
            onNavigate={onNavigate}
            onNavigateTag={onNavigateTag}
            hrefForRoute={hrefForRoute}
            storageKey={`${storageScope}:navigation:${tag.name}`}
            key={tag.name}
          />
        ))}
    </>
  );
}

type NavigationItem =
  OperationModel | { subgroup: string; operations: OperationModel[] };

function groupBySubgroup(operations: OperationModel[]): NavigationItem[] {
  const subgroups = new Map<string, OperationModel[]>();
  const items: NavigationItem[] = [];
  for (const item of operations) {
    const subgroup = item.operation['x-tagSubgroup']?.trim();
    if (!subgroup) {
      items.push(item);
      continue;
    }
    const existing = subgroups.get(subgroup);
    const subgroupOperations = existing ?? [];
    if (!existing) items.push({ subgroup, operations: subgroupOperations });
    subgroupOperations.push(item);
    subgroups.set(subgroup, subgroupOperations);
  }
  return items;
}

function NavigationGroup({
  tag,
  operations,
  searching,
  singleExpanded,
  open,
  onOpenChange,
  activeTag,
  activeOperationId,
  onNavigate,
  onNavigateTag,
  hrefForRoute,
  storageKey,
}: {
  tag: TagModel;
  operations: OperationModel[];
  searching: boolean;
  singleExpanded: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTag?: TagModel;
  activeOperationId?: string;
  onNavigate: (operationId?: string) => void;
  onNavigateTag: (tag: TagModel) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
  storageKey: string;
}) {
  const [independentlyOpen, setIndependentlyOpen] = useLocalState(
    storageKey,
    false,
  );
  const [isOpen, setOpen] = singleExpanded
    ? [open, onOpenChange]
    : [independentlyOpen, setIndependentlyOpen];
  const groupRef = useRef<HTMLDivElement>(null);
  const wasActiveRouteWithinGroup = useRef(false);
  const isActiveTag = activeTag === tag;
  const activeRouteIsWithinGroup =
    isActiveTag || operations.some((item) => item.id === activeOperationId);
  const expanded = searching || isOpen;
  const operationListId = `sp-nav-${slugify(tag.name)}`;
  const navigationItems = groupBySubgroup(operations);

  const operationLink = (item: OperationModel) => {
    const isActive = activeOperationId === item.id;
    return (
      <a
        className={`sp-nav-operation ${isActive ? 'is-active ' : ''}${item.operation.deprecated ? 'is-deprecated' : ''}`}
        href={hrefForRoute({ page: 'operation', operationId: item.id })}
        aria-current={isActive ? 'page' : undefined}
        onClick={(event) => {
          event.preventDefault();
          onNavigate(item.id);
        }}
        key={item.id}
      >
        <span className="sp-nav-operation-label">
          {item.operation.summary ?? item.path}
        </span>
        <span className="sp-nav-operation-meta">
          <LifecycleBadge item={item} />
          {item.operation.deprecated && (
            <span className="sp-deprecated">deprecated</span>
          )}
          <OperationBadge item={item} compact />
        </span>
      </a>
    );
  };

  useEffect(() => {
    if (activeRouteIsWithinGroup && !wasActiveRouteWithinGroup.current)
      setOpen(true);
    wasActiveRouteWithinGroup.current = activeRouteIsWithinGroup;
  }, [activeRouteIsWithinGroup, setOpen]);

  useEffect(() => {
    if (!activeRouteIsWithinGroup || !expanded) return;
    const activeLink = groupRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    const scrollContainer =
      groupRef.current?.closest<HTMLElement>('.sp-nav-scroll');
    if (activeLink && scrollContainer)
      scrollWithinContainer(scrollContainer, activeLink);
  }, [activeRouteIsWithinGroup, activeOperationId, activeTag, expanded]);

  return (
    <div ref={groupRef} className="sp-nav-group">
      <button
        type="button"
        className={`sp-nav-tag ${tag.icon ? 'has-icon ' : ''}${activeRouteIsWithinGroup ? 'is-active' : ''}`}
        onClick={() => setOpen(!expanded)}
        aria-expanded={expanded}
        aria-controls={operationListId}
      >
        <span className="sp-tag-label">
          <TagIcon tag={tag} />
          {tag.name}
        </span>
        <DisclosureChevron />
      </button>
      {expanded && (
        <DisclosureContent className="sp-nav-operations" id={operationListId}>
          <a
            className={`sp-nav-operation sp-nav-overview ${isActiveTag ? 'is-active' : ''}`}
            href={hrefForRoute({ page: 'tag', tag: tagSlug(tag) })}
            aria-current={isActiveTag ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault();
              onNavigateTag(tag);
            }}
          >
            Overview
          </a>
          {navigationItems.map((item) =>
            'subgroup' in item ? (
              <section
                className="sp-nav-subgroup"
                aria-labelledby={`${operationListId}-${slugify(item.subgroup)}`}
                key={item.subgroup}
              >
                <h3 id={`${operationListId}-${slugify(item.subgroup)}`}>
                  {item.subgroup}
                </h3>
                {item.operations.map(operationLink)}
              </section>
            ) : (
              operationLink(item)
            ),
          )}
        </DisclosureContent>
      )}
    </div>
  );
}
