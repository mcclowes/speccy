// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { parseStudioRoute, referenceHref } from './routing';

describe('studio routing', () => {
  it('parses reference-scoped nested routes', () => {
    expect(parseStudioRoute({ pathname: '/references/catalog/operations/list-companies', search: '' }))
      .toEqual({
        page: 'reference',
        referenceId: 'catalog',
        referenceRoute: { page: 'operation', operationId: 'list-companies' },
        sourceUrl: undefined,
      });
  });

  it('keeps a remote source locator in nested links', () => {
    const href = referenceHref('catalog', { page: 'tag', tag: 'companies' }, 'https://example.com/openapi.yaml?version=2');

    expect(href).toBe('/references/catalog/tags/companies?source=https%3A%2F%2Fexample.com%2Fopenapi.yaml%3Fversion%3D2');
    expect(parseStudioRoute(new URL(href, 'https://speccy.test'))).toEqual({
      page: 'reference',
      referenceId: 'catalog',
      referenceRoute: { page: 'tag', tag: 'companies' },
      sourceUrl: 'https://example.com/openapi.yaml?version=2',
    });
  });

  it('uses the query-only open route as an import entry point', () => {
    expect(parseStudioRoute(new URL('/open?url=https%3A%2F%2Fexample.com%2Fopenapi.yaml', 'https://speccy.test')))
      .toEqual({ page: 'open', url: 'https://example.com/openapi.yaml' });
  });
});
