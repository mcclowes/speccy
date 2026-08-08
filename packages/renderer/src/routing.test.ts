import { describe, expect, it } from 'vitest';
import { parseRoutePath, routePath } from './routing';

describe('renderer routing', () => {
  it('round-trips canonical nested routes', () => {
    const route = { page: 'operation', operationId: 'list companies' } as const;
    const path = routePath(route, '/references/catalog');

    expect(path).toBe('/references/catalog/operations/list%20companies');
    expect(parseRoutePath(path, '/references/catalog')).toEqual(route);
  });

  it('supports the renderer legacy operation path', () => {
    const options = { operationSegment: '' };
    expect(routePath({ page: 'operation', operationId: 'list-companies' }, '/docs', options)).toBe('/docs/list-companies');
    expect(parseRoutePath('/docs/list-companies', '/docs', options)).toEqual({ page: 'operation', operationId: 'list-companies' });
  });

  it('keeps reference keys readable in URLs', () => {
    const path = routePath({ page: 'reference', section: 'securitySchemes' });
    expect(path).toBe('/reference/security-schemes');
    expect(parseRoutePath(path)).toEqual({ page: 'reference', section: 'securitySchemes' });
  });
});
