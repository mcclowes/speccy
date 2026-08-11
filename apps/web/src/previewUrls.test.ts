import { describe, expect, it } from 'vitest';
import { parseInitialLocation, previewHref } from './previewUrls';

describe('preview URLs', () => {
  it('creates and parses a self-contained local preview', () => {
    const href = previewHref(
      { page: 'overview' },
      { source: '{}', name: 'Catalog' },
      'https://speccy.test',
      true,
    );
    const parsed = parseInitialLocation(new URL(href));

    expect(parsed).toEqual({
      preview: true,
      source: '{}',
      name: 'Catalog',
      sourceUrl: undefined,
      tryIt: undefined,
    });
  });

  it('keeps remote source URLs out of the fragment', () => {
    const href = new URL(
      previewHref(
        { page: 'operation', operationId: 'list' },
        { source: '', sourceUrl: 'https://example.com/openapi.yaml' },
        'https://speccy.test',
        true,
      ),
    );
    expect(href.pathname).toBe('/references/preview/operations/list');
    expect(href.searchParams.get('url')).toBe(
      'https://example.com/openapi.yaml',
    );
    expect(href.hash).toBe('');
  });

  it('preserves a disabled try-it panel in shared previews', () => {
    const href = previewHref(
      { page: 'overview' },
      { source: '{}', tryIt: false },
      'https://speccy.test',
      true,
    );

    expect(new URL(href).searchParams.get('tryIt')).toBe('0');
    expect(parseInitialLocation(new URL(href)).tryIt).toBe(false);
  });
});
