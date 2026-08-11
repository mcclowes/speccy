/**
 * ---
 * purpose: Parses self-contained previews and creates stable local or remote preview links.
 * related:
 *   - ./App.tsx - Applies preview data and supplies these links to the renderer.
 *   - ./routing.ts - Encodes the nested renderer route used by each preview.
 * ---
 */

import type { SpeccyRoute } from 'speccy-renderer';
import { referenceHref } from './routing';

export interface PreviewSource {
  source: string;
  sourceUrl?: string;
  name?: string;
  tryIt?: boolean;
}

export function parseInitialLocation(
  location: Pick<Location, 'search' | 'hash'>,
): PreviewSource & { preview: boolean } {
  const search = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ''));
  return {
    preview: search.get('preview') === '1',
    source: fragment.get('source') ?? '',
    name: fragment.get('name') ?? undefined,
    sourceUrl: search.get('url') ?? undefined,
    tryIt: search.get('tryIt') === '0' ? false : undefined,
  };
}

export function previewHref(
  route: SpeccyRoute,
  preview: PreviewSource,
  origin: string,
  absolute = false,
): string {
  const target = new URL(referenceHref('preview', route), origin);
  target.searchParams.set('preview', '1');
  if (preview.tryIt === false) target.searchParams.set('tryIt', '0');
  if (preview.sourceUrl) target.searchParams.set('url', preview.sourceUrl);
  else
    target.hash = new URLSearchParams({
      source: preview.source,
      name: preview.name || 'API reference',
    }).toString();
  return absolute
    ? target.toString()
    : `${target.pathname}${target.search}${target.hash}`;
}
