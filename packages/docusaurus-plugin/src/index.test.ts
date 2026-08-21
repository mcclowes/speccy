import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  default as speccyPlugin,
  devSpecDir,
  loadSpec,
  normalizeRoute,
  operationCatalog,
  publicSpecFilename,
  publicSpecUrl,
  referenceRoutes,
  writePublicSpec,
} from './index';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('normalizeRoute', () => {
  it('adds a leading slash and strips trailing slashes', () => {
    expect(normalizeRoute('reference/')).toBe('/reference');
    expect(normalizeRoute('/')).toBe('/');
  });
});

describe('public OpenAPI description', () => {
  it('builds a URL under the Docusaurus base and API route', () => {
    expect(publicSpecUrl('/docs/', '/api')).toBe('/docs/api/openapi.yaml');
    expect(publicSpecUrl('/docs/', '/api', '{"openapi":"3.1.0"}')).toBe(
      '/docs/api/openapi.json',
    );
  });

  it('chooses the filename from the source syntax', () => {
    expect(publicSpecFilename('openapi: 3.1.0\n')).toBe('openapi.yaml');
    expect(publicSpecFilename(' {"openapi":"3.1.0"}\n')).toBe('openapi.json');
    expect(publicSpecFilename({ openapi: '3.1.0' })).toBe('openapi.json');
  });

  it('writes the rendered description under the API route', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'speccy-build-'));
    const path = await writePublicSpec(outDir, '/api', 'openapi: 3.1.0\n');

    expect(path).toBe(join(outDir, 'api', 'openapi.yaml'));
    await expect(readFile(path, 'utf8')).resolves.toBe('openapi: 3.1.0\n');
  });

  it('writes JSON sources with a JSON extension without changing them', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'speccy-build-'));
    const source = '{"openapi":"3.1.0"}\n';
    const path = await writePublicSpec(outDir, '/api', source);

    expect(path).toBe(join(outDir, 'api', 'openapi.json'));
    await expect(readFile(path, 'utf8')).resolves.toBe(source);
  });

  it('serves the description from the dev server, where postBuild never runs', async () => {
    const siteDir = await mkdtemp(join(tmpdir(), 'speccy-site-'));
    const generatedFilesDir = await mkdtemp(
      join(tmpdir(), 'speccy-generated-'),
    );
    await writeFile(join(siteDir, 'openapi.yaml'), 'openapi: 3.1.0\n');
    const plugin = speccyPlugin(
      { siteDir, generatedFilesDir, baseUrl: '/docs/' } as never,
      {
        id: 'backoffice',
        route: '/api/backoffice',
        spec: 'openapi.yaml',
        renderer: { showDeveloperHints: false },
      },
    );

    await plugin.loadContent?.();
    const directory = devSpecDir(generatedFilesDir, 'backoffice');

    await expect(
      readFile(join(directory, 'openapi.yaml'), 'utf8'),
    ).resolves.toBe('openapi: 3.1.0\n');
    expect(
      plugin.configureWebpack?.({}, false, {} as never, {} as never),
    ).toEqual({
      devServer: {
        static: [{ publicPath: '/docs/api/backoffice', directory }],
      },
    });
  });

  it('leaves the dev copy out of production builds', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const siteDir = await mkdtemp(join(tmpdir(), 'speccy-site-'));
    const generatedFilesDir = await mkdtemp(
      join(tmpdir(), 'speccy-generated-'),
    );
    await writeFile(join(siteDir, 'openapi.yaml'), 'openapi: 3.1.0\n');
    const plugin = speccyPlugin(
      { siteDir, generatedFilesDir, baseUrl: '/' } as never,
      { spec: 'openapi.yaml' },
    );

    await plugin.loadContent?.();

    expect(
      plugin.configureWebpack?.({}, false, {} as never, {} as never),
    ).toEqual({});
    await expect(
      readFile(join(devSpecDir(generatedFilesDir, 'default'), 'openapi.yaml')),
    ).rejects.toThrow('ENOENT');
  });

  it('links JSON references to the emitted JSON file', async () => {
    const siteDir = await mkdtemp(join(tmpdir(), 'speccy-site-'));
    await writeFile(
      join(siteDir, 'openapi.json'),
      '{"openapi":"3.1.0","info":{"title":"Test API"},"paths":{}}',
    );
    const plugin = speccyPlugin(
      {
        siteDir,
        generatedFilesDir: await mkdtemp(join(tmpdir(), 'speccy-generated-')),
        baseUrl: '/docs/',
      } as never,
      { spec: 'openapi.json', renderer: { showDeveloperHints: false } },
    );

    await expect(plugin.loadContent?.()).resolves.toMatchObject({
      renderer: { openApiUrl: '/docs/api/openapi.json' },
    });
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

  it('creates a webhooks reference route only when the spec declares webhooks', () => {
    const withoutWebhooks = referenceRoutes(
      { openapi: '3.1.0', info: { title: 'Test API' }, paths: {} },
      '/api',
    );
    expect(withoutWebhooks).not.toContainEqual({
      path: '/api/reference/webhooks',
      route: { page: 'reference', section: 'webhooks' },
    });

    const withWebhooks = referenceRoutes(
      {
        openapi: '3.1.0',
        info: { title: 'Test API' },
        paths: {},
        webhooks: {
          'book.indexed': { post: { operationId: 'bookIndexed' } },
        },
      },
      '/api',
    );
    expect(withWebhooks).toContainEqual({
      path: '/api/reference/webhooks',
      route: { page: 'reference', section: 'webhooks' },
    });
  });

  it('rejects generated route collisions', () => {
    expect(() =>
      referenceRoutes(
        {
          openapi: '3.1.0',
          info: { title: 'Test API' },
          tags: [{ name: 'Credit cards' }, { name: 'Credit-cards' }],
          paths: {
            '/credit-cards': {
              get: { tags: ['Credit cards'] },
              post: { tags: ['Credit-cards'] },
            },
          },
        },
        '/api',
      ),
    ).toThrow('both generate /api/tags/credit-cards');
  });
});

describe('operationCatalog', () => {
  it('emits compact lookup and preview data without the full document', () => {
    const catalog = operationCatalog({
      openapi: '3.1.0',
      info: { title: 'Test API' },
      paths: {
        '/companies/{id}': {
          get: {
            operationId: 'getCompany',
            parameters: [
              {
                in: 'path',
                name: 'id',
                required: true,
                schema: { type: 'string', example: 'company-1' },
              },
            ],
            responses: {
              '200': {
                description: 'Company',
                content: {
                  'application/json': { example: { id: 'company-1' } },
                },
              },
            },
          },
        },
      },
    });

    expect(catalog).toEqual([
      expect.objectContaining({
        id: 'getcompany',
        operationId: 'getCompany',
        method: 'get',
        path: '/companies/{id}',
        preview: {
          request: { path: { id: 'company-1' }, query: {}, headers: {} },
          response: { id: 'company-1' },
        },
      }),
    ]);
    expect(JSON.stringify(catalog)).not.toContain('Test API');
  });
});

describe('route generation', () => {
  const spec = {
    openapi: '3.1.0',
    info: { title: 'Test API' },
    paths: {
      '/companies': {
        get: { operationId: 'listCompanies' },
      },
    },
  };

  async function generate(routeGeneration?: 'static' | 'client') {
    const createData = vi.fn(
      async (name: string, _data: string) => `/data/${name}`,
    );
    const addRoute = vi.fn();
    const setGlobalData = vi.fn();
    const plugin = speccyPlugin({ siteDir: '/site', baseUrl: '/' } as never, {
      spec,
      routeGeneration,
    });

    await plugin.contentLoaded?.({
      content: {
        name: 'default',
        spec,
        route: '/api',
        routeGeneration: routeGeneration ?? 'static',
        layout: { noFooter: true },
        renderer: {},
      },
      actions: { createData, addRoute, setGlobalData },
    } as never);

    return { createData, addRoute, setGlobalData };
  }

  it('shares one spec module across static routes', async () => {
    const { createData, addRoute } = await generate();

    expect(addRoute).toHaveBeenCalledTimes(3);
    expect(createData).toHaveBeenCalledTimes(4);
    expect(createData.mock.calls[0]?.[1]).toContain('"spec"');
    expect(
      createData.mock.calls
        .slice(1)
        .every(([, data]) => !data.includes('"spec"')),
    ).toBe(true);
    expect(addRoute.mock.calls[1]?.[0]).toMatchObject({
      path: '/api/listcompanies',
      exact: true,
      modules: {
        reference: expect.stringContaining('speccy-reference-api.json'),
        initialRoute: expect.stringContaining('speccy-route-api-1.json'),
      },
    });
  });

  it('supports one client-routed catch-all page', async () => {
    const { createData, addRoute } = await generate('client');

    expect(createData).toHaveBeenCalledTimes(1);
    expect(addRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api',
        exact: false,
        modules: {
          reference: expect.stringContaining('speccy-reference-api.json'),
        },
      }),
    );
  });

  it('supports nested static plugin instances with distinct IDs', async () => {
    const routes: string[] = [];

    for (const [id, route] of [
      ['multi', '/api'],
      ['backoffice', '/api/backoffice'],
    ] as const) {
      const plugin = speccyPlugin({ siteDir: '/site', baseUrl: '/' } as never, {
        id,
        spec,
        route,
      });
      await plugin.contentLoaded?.({
        content: {
          name: id,
          spec,
          route,
          routeGeneration: 'static',
          layout: { noFooter: true },
          renderer: {},
        },
        actions: {
          setGlobalData: vi.fn(),
          createData: async (name: string) => `/data/${id}/${name}`,
          addRoute: ({ path }: { path: string }) => routes.push(path),
        },
      } as never);
    }

    expect(routes).toEqual(
      expect.arrayContaining([
        '/api',
        '/api/listcompanies',
        '/api/backoffice',
        '/api/backoffice/listcompanies',
      ]),
    );
    expect(new Set(routes)).toHaveProperty('size', routes.length);
  });
});
