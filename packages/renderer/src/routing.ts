/**
 * ---
 * purpose: Encodes and parses renderer routes without owning browser history or host-specific URL prefixes.
 * related:
 *   - ./types.ts - Defines the route variants encoded here.
 *   - ../../../apps/web/src/routing.ts - Adds a stored-reference prefix around this shared codec.
 * ---
 */

import type { SpeccyRoute } from './types';

export interface RoutePathOptions {
  /** Keeps the renderer's original `/:operationId` URL shape when set to an empty string. */
  operationSegment?: string;
}

function normalizeBasePath(path: string): string {
  if (!path || path === '/') return '';
  return `/${path.replace(/^\/+|\/+$/g, '')}`;
}

function referenceSlug(section: string): string {
  return section.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function referenceSection(slug: string): string {
  return slug.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function routePath(route: SpeccyRoute, basePath = '', options: RoutePathOptions = {}): string {
  const root = normalizeBasePath(basePath);
  const operationSegment = options.operationSegment ?? 'operations';
  if (route.page === 'overview') return root || '/';
  if (route.page === 'operation') {
    const prefix = operationSegment ? `/${operationSegment}` : '';
    return `${root}${prefix}/${encodeURIComponent(route.operationId)}`;
  }
  if (route.page === 'tag') return `${root}/tags/${encodeURIComponent(route.tag)}`;
  return `${root}/reference/${encodeURIComponent(referenceSlug(route.section))}`;
}

export function parseRoutePath(pathname: string, basePath = '', options: RoutePathOptions = {}): SpeccyRoute | undefined {
  const root = normalizeBasePath(basePath);
  if (pathname === root || (!root && pathname === '/')) return { page: 'overview' };
  const prefix = `${root}/`;
  if (!pathname.startsWith(prefix)) return undefined;

  const segments = pathname.slice(prefix.length).split('/').filter(Boolean).map(decodeURIComponent);
  const operationSegment = options.operationSegment ?? 'operations';
  if (operationSegment && segments.length === 2 && segments[0] === operationSegment) {
    return { page: 'operation', operationId: segments[1]! };
  }
  if (!operationSegment && segments.length === 1) return { page: 'operation', operationId: segments[0]! };
  if (segments.length === 2 && segments[0] === 'tags') return { page: 'tag', tag: segments[1]! };
  if (segments.length === 2 && segments[0] === 'reference') return { page: 'reference', section: referenceSection(segments[1]!) };
  return undefined;
}
