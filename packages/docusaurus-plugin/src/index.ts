/**
 * ---
 * purpose: Implements the Docusaurus build plugin and turns OpenAPI sources into generated reference routes.
 * related:
 *   - ./page.tsx - Route component that receives the generated spec data.
 *   - ./client.tsx - Public component for direct MDX and React embedding.
 * ---
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LoadContext, Plugin } from '@docusaurus/types';
import {
  createReferenceModel,
  parseSpec,
  routePath,
  type OpenAPIDocument,
  type SpeccyProps,
  type SpeccyRoute,
} from 'speccy-renderer';
import { runSpectral } from 'speccy-spectral';

const require = createRequire(import.meta.url);

export interface SpeccyPluginOptions {
  /** Route where the reference is mounted. Defaults to /api. */
  route?: string;
  /** Local YAML or JSON file, resolved from the Docusaurus site directory. */
  spec?: string | OpenAPIDocument;
  /** Remote YAML or JSON document fetched during the Docusaurus build. */
  specUrl?: string;
  /** Renderer settings applied to the generated route. */
  renderer?: Omit<SpeccyProps, 'spec'>;
}

export interface SpeccyPluginContent {
  spec: string | OpenAPIDocument;
  route: string;
  renderer: Omit<SpeccyProps, 'spec'>;
}

function joinUrlPath(...parts: string[]): string {
  return `/${parts
    .flatMap((part) => part.split('/'))
    .filter(Boolean)
    .join('/')}`;
}

export function publicSpecUrl(baseUrl: string, route: string): string {
  return joinUrlPath(baseUrl, route, 'openapi.yaml');
}

export async function writePublicSpec(
  outDir: string,
  route: string,
  spec: string | OpenAPIDocument,
): Promise<string> {
  const path = resolve(outDir, `.${normalizeRoute(route)}`, 'openapi.yaml');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    typeof spec === 'string' ? spec : `${JSON.stringify(spec, null, 2)}\n`,
  );
  return path;
}

const REFERENCE_SECTIONS = [
  'schemas',
  'parameters',
  'requestBodies',
  'responses',
  'headers',
  'examples',
  'links',
  'callbacks',
  'securitySchemes',
] as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function referenceRoutes(
  spec: string | OpenAPIDocument,
  basePath: string,
): Array<{ path: string; route: SpeccyRoute }> {
  const model = createReferenceModel(parseSpec(spec));
  const routes: SpeccyRoute[] = [
    { page: 'overview' },
    ...[...model.operations, ...model.webhooks].map((operation) => ({
      page: 'operation' as const,
      operationId: operation.id,
    })),
    ...model.tags.map((tag) => ({
      page: 'tag' as const,
      tag: slugify(tag.name) || tag.name,
    })),
    ...REFERENCE_SECTIONS.filter(
      (section) =>
        Object.keys(model.document.components?.[section] ?? {}).length > 0,
    ).map((section) => ({ page: 'reference' as const, section })),
  ];

  return routes.map((route) => ({
    path: routePath(route, basePath, { operationSegment: '' }),
    route,
  }));
}

export function normalizeRoute(route = '/api'): string {
  const withSlash = route.startsWith('/') ? route : `/${route}`;
  const normalized = withSlash.replace(/\/+$/, '');
  return normalized || '/';
}

export async function loadSpec(
  options: SpeccyPluginOptions,
  siteDir: string,
  fetcher: typeof fetch = fetch,
): Promise<string | OpenAPIDocument> {
  if (options.specUrl) {
    const response = await fetcher(options.specUrl);
    if (!response.ok)
      throw new Error(
        `Could not load OpenAPI document from ${options.specUrl}: ${response.status} ${response.statusText}`,
      );
    return response.text();
  }
  if (typeof options.spec === 'string') {
    const path = isAbsolute(options.spec)
      ? options.spec
      : resolve(siteDir, options.spec);
    return readFile(path, 'utf8');
  }
  if (options.spec) return options.spec;
  throw new Error('Speccy needs either spec, a local spec path, or specUrl.');
}

export default function speccyPlugin(
  context: LoadContext,
  options: SpeccyPluginOptions,
): Plugin<SpeccyPluginContent> {
  return {
    name: 'docusaurus-plugin-speccy',
    getClientModules() {
      return [require.resolve('speccy-renderer/styles.css')];
    },
    async loadContent() {
      const spec = await loadSpec(options, context.siteDir);
      const route = normalizeRoute(options.route);
      const renderer = { ...options.renderer };
      renderer.openApiUrl ??= publicSpecUrl(context.baseUrl, route);
      if (
        process.env.NODE_ENV !== 'production' &&
        renderer.showDeveloperHints !== false
      ) {
        renderer.spectralDiagnostics = [
          ...(renderer.spectralDiagnostics ?? []),
          ...(await runSpectral(spec)),
        ];
      }
      return {
        spec,
        route,
        renderer,
      };
    },
    async contentLoaded({ content, actions }) {
      const component = fileURLToPath(new URL('./page.js', import.meta.url));
      for (const [index, generated] of referenceRoutes(
        content.spec,
        content.route,
      ).entries()) {
        const dataPath = await actions.createData(
          `speccy-reference-${index}.json`,
          JSON.stringify({
            spec: content.spec,
            route: content.route,
            initialRoute: generated.route,
            renderer: content.renderer,
          }),
        );
        actions.addRoute({
          path: generated.path,
          exact: true,
          component,
          modules: { reference: dataPath },
        });
      }
    },
    async postBuild({ content, outDir }) {
      await writePublicSpec(outDir, content.route, content.spec);
    },
  };
}
