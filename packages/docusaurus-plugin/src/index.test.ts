import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  loadSpec,
  normalizeRoute,
  publicSpecUrl,
  referenceRoutes,
  writePublicSpec,
} from './index';

describe('normalizeRoute', () => {
  it('adds a leading slash and strips trailing slashes', () => {
    expect(normalizeRoute('reference/')).toBe('/reference');
    expect(normalizeRoute('/')).toBe('/');
  });
});

describe('public OpenAPI description', () => {
  it('builds a URL under the Docusaurus base and API route', () => {
    expect(publicSpecUrl('/docs/', '/api')).toBe('/docs/api/openapi.yaml');
  });

  it('writes the rendered description under the API route', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'speccy-build-'));
    const path = await writePublicSpec(outDir, '/api', 'openapi: 3.1.0\n');

    expect(path).toBe(join(outDir, 'api', 'openapi.yaml'));
    await expect(readFile(path, 'utf8')).resolves.toBe('openapi: 3.1.0\n');
  });
});

describe('loadSpec', () => {
  it('reads relative spec paths from the site directory', async () => {
    const siteDir = await mkdtemp(join(tmpdir(), 'speccy-'));
    await writeFile(join(siteDir, 'openapi.yaml'), 'openapi: 3.1.0');

    await expect(loadSpec({ spec: 'openapi.yaml' }, siteDir)).resolves.toBe(
      'openapi: 3.1.0',
    );
  });

  it('returns inline documents without changing them', async () => {
    const spec = { openapi: '3.1.0' };
    await expect(loadSpec({ spec }, '/tmp')).resolves.toBe(spec);
  });

  it('reports a missing source clearly', async () => {
    await expect(loadSpec({}, '/tmp')).rejects.toThrow('needs either spec');
  });
});

describe('referenceRoutes', () => {
  it('creates static routes with matching initial renderer state', () => {
    const routes = referenceRoutes(
      {
        openapi: '3.1.0',
        info: { title: 'Test API' },
        tags: [{ name: 'Companies' }],
        paths: {
          '/companies': {
            get: {
              operationId: 'listCompanies',
              tags: ['Companies'],
            },
          },
        },
        components: {
          schemas: { Company: { type: 'object' } },
        },
      },
      '/api',
    );

    expect(routes).toEqual(
      expect.arrayContaining([
        { path: '/api', route: { page: 'overview' } },
        {
          path: '/api/listcompanies',
          route: { page: 'operation', operationId: 'listcompanies' },
        },
        {
          path: '/api/tags/companies',
          route: { page: 'tag', tag: 'companies' },
        },
        {
          path: '/api/reference/schemas',
          route: { page: 'reference', section: 'schemas' },
        },
      ]),
    );
  });
});
