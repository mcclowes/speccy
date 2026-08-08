/**
 * ---
 * purpose: Parses and creates standalone studio URLs without coupling the renderer to browser history.
 * related:
 *   - ./App.tsx - Owns browser navigation and applies parsed routes to studio state.
 *   - ../../../packages/renderer/src/types.ts - Declares the nested reference route shape.
 * ---
 */

import { parseRoutePath, routePath, type SpeccyRoute } from 'speccy-renderer';

export type StudioRoute =
  | { page: 'home' }
  | { page: 'open'; url: string }
  | { page: 'reference'; referenceId: string; referenceRoute: SpeccyRoute; sourceUrl?: string };

type LocationValue = Pick<Location, 'pathname' | 'search'>;

export function parseStudioRoute(location: LocationValue): StudioRoute {
  const query = new URLSearchParams(location.search);
  if (location.pathname === '/open' || location.pathname === '/') {
    const url = query.get('url');
    if (url) return { page: 'open', url };
    if (location.pathname === '/') return { page: 'home' };
  }

  const segments = location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (segments[0] !== 'references' || !segments[1]) return { page: 'home' };

  const [, referenceId, ...routeSegments] = segments;
  const referenceRoute = parseRoutePath(`/${routeSegments.map(encodeURIComponent).join('/')}`);
  if (!referenceRoute) return { page: 'home' };

  return {
    page: 'reference',
    referenceId,
    referenceRoute,
    sourceUrl: query.get('source') ?? undefined,
  };
}

export function referenceHref(referenceId: string, route: SpeccyRoute, sourceUrl?: string): string {
  const root = `/references/${encodeURIComponent(referenceId)}`;
  const pathname = routePath(route, root);

  if (!sourceUrl) return pathname;
  const query = new URLSearchParams({ source: sourceUrl });
  return `${pathname}?${query}`;
}
