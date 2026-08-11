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
  /** Builds each reference page statically, or uses one client-routed catch-all page. Defaults to static. */
  routeGeneration?: 'static' | 'client';
  /** Renderer settings applied to the generated route. */
  renderer?: Omit<SpeccyProps, 'spec'>;
}

export interface SpeccyPluginContent {
  spec: string | OpenAPIDocument;
  route: string;
  routeGeneration: 'static' | 'client';
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

  const generated = routes.map((route) => ({
    path: routePath(route, basePath, { operationSegment: '' }),
    route,
  }));
  const routeByPath = new Map<string, SpeccyRoute>();
  for (const item of generated) {
    const existing = routeByPath.get(item.path);
    if (existing) {
      throw new Error(
        `Speccy routes ${JSON.stringify(existing)} and ${JSON.stringify(item.route)} both generate ${item.path}. Use unique operation IDs and tag names.`,
      );
    }
    routeByPath.set(item.path, item.route);
  }
  return generated;
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
        routeGeneration: options.routeGeneration ?? 'static',
        renderer,
      };
    },
    async contentLoaded({ content, actions }) {
      const component = fileURLToPath(new URL('./page.js', import.meta.url));
      const dataName =
        content.route.split('/').filter(Boolean).join('-') || 'root';
      const referenceDataPath = await actions.createData(
        `speccy-reference-${dataName}.json`,
        JSON.stringify({
          spec: content.spec,
          route: content.route,
          renderer: content.renderer,
        }),
      );

      if (content.routeGeneration === 'client') {
        actions.addRoute({
          path: content.route,
          exact: false,
          component,
          modules: { reference: referenceDataPath },
        });
        return;
      }

      for (const [index, generated] of referenceRoutes(
        content.spec,
        content.route,
      ).entries()) {
        const routeDataPath = await actions.createData(
          `speccy-route-${dataName}-${index}.json`,
          JSON.stringify(generated.route),
        );
        actions.addRoute({
          path: generated.path,
          exact: true,
          component,
          modules: {
            reference: referenceDataPath,
            initialRoute: routeDataPath,
          },
        });
      }
    },
    async postBuild({ content, outDir }) {
      await writePublicSpec(outDir, content.route, content.spec);
    },
  };
}
