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
  deriveOperationPreviewDataFromOperation,
  parseSpec,
  routePath,
  type OpenAPIDocument,
  type OperationPreviewData,
  type SpeccyProps,
  type SpeccyRoute,
} from 'speccy-renderer';
import { runSpectral } from 'speccy-spectral';
import { slugifyReferenceName } from './metadata';

const require = createRequire(import.meta.url);

export interface SpeccyPluginOptions {
  /** Unique Docusaurus plugin instance ID. Required when registering more than one reference. */
  id?: string;
  /** Route where the reference is mounted. Defaults to /api. */
  route?: string;
  /** Local YAML or JSON file, resolved from the Docusaurus site directory. */
  spec?: string | OpenAPIDocument;
  /** Remote YAML or JSON document fetched during the Docusaurus build. */
  specUrl?: string;
  /** Builds each reference page statically, or uses one client-routed catch-all page. Defaults to static. */
  routeGeneration?: 'static' | 'client';
  /** Docusaurus page layout settings, or false for an unwrapped full-page reference. */
  layout?: false | { noFooter?: boolean };
  /** Renderer settings applied to the generated route. */
  renderer?: Omit<SpeccyProps, 'spec'>;
}

export interface SpeccyPluginContent {
  name: string;
  spec: string | OpenAPIDocument;
  route: string;
  routeGeneration: 'static' | 'client';
  layout: false | { noFooter: boolean };
  renderer: Omit<SpeccyProps, 'spec'>;
}

export interface SpeccyOperationCatalogEntry {
  id: string;
  operationId?: string;
  method: string;
  path: string;
  preview: OperationPreviewData;
}

export interface SpeccyPluginGlobalData {
  name: string;
  route: string;
  operations: SpeccyOperationCatalogEntry[];
}

export function operationCatalog(
  spec: string | OpenAPIDocument,
): SpeccyOperationCatalogEntry[] {
  const model = createReferenceModel(parseSpec(spec));
  return [...model.operations, ...model.webhooks].map((operation) => ({
    id: operation.id,
    operationId: operation.operation.operationId,
    method: operation.method,
    path: operation.path,
    preview: deriveOperationPreviewDataFromOperation(
      operation.pathItem,
      operation.operation,
    ),
  }));
}

function joinUrlPath(...parts: string[]): string {
  return `/${parts
    .flatMap((part) => part.split('/'))
    .filter(Boolean)
    .join('/')}`;
}

export function publicSpecFilename(
  spec?: string | OpenAPIDocument,
): 'openapi.json' | 'openapi.yaml' {
  if (typeof spec !== 'string') return spec ? 'openapi.json' : 'openapi.yaml';
  try {
    JSON.parse(spec);
    return 'openapi.json';
  } catch {
    return 'openapi.yaml';
  }
}

export function publicSpecUrl(
  baseUrl: string,
  route: string,
  spec?: string | OpenAPIDocument,
): string {
  return joinUrlPath(baseUrl, route, publicSpecFilename(spec));
}

export async function writePublicSpec(
  outDir: string,
  route: string,
  spec: string | OpenAPIDocument,
): Promise<string> {
  return writeSpecFile(resolve(outDir, `.${normalizeRoute(route)}`), spec);
}

/**
 * Directory mounted by the dev server so the published description resolves
 * under `docusaurus start`, where postBuild never runs.
 */
export function devSpecDir(
  generatedFilesDir: string,
  pluginId: string,
): string {
  return resolve(
    generatedFilesDir,
    'docusaurus-plugin-speccy',
    pluginId,
    'public',
  );
}

export async function writeDevSpec(
  generatedFilesDir: string,
  pluginId: string,
  spec: string | OpenAPIDocument,
): Promise<string> {
  return writeSpecFile(devSpecDir(generatedFilesDir, pluginId), spec);
}

type WebpackConfigOverride = ReturnType<
  NonNullable<Plugin['configureWebpack']>
>;

/**
 * Mounts a directory on the dev server. `static` is a webpack-dev-server option
 * the exposed webpack Configuration type does not declare, and webpack-merge
 * concatenates the array, so this composes with the site's own static
 * directories instead of replacing them.
 */
function devServerStatic(
  publicPath: string,
  directory: string,
): WebpackConfigOverride {
  return {
    devServer: { static: [{ publicPath, directory }] },
  } as WebpackConfigOverride;
}

async function writeSpecFile(
  dir: string,
  spec: string | OpenAPIDocument,
): Promise<string> {
  const path = resolve(dir, publicSpecFilename(spec));
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
      tag: slugifyReferenceName(tag.name) || tag.name,
    })),
    ...(model.webhooks.length > 0
      ? [{ page: 'reference' as const, section: 'webhooks' }]
      : []),
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
  const pluginId = options.id ?? 'default';
  const isDev = process.env.NODE_ENV !== 'production';
  return {
    name: 'docusaurus-plugin-speccy',
    getClientModules() {
      return [require.resolve('speccy-renderer/styles.css')];
    },
    configureWebpack() {
      if (!isDev) return {};
      return devServerStatic(
        joinUrlPath(context.baseUrl, normalizeRoute(options.route)),
        devSpecDir(context.generatedFilesDir, pluginId),
      );
    },
    async loadContent() {
      const spec = await loadSpec(options, context.siteDir);
      const route = normalizeRoute(options.route);
      const renderer = { ...options.renderer };
      renderer.openApiUrl ??= publicSpecUrl(context.baseUrl, route, spec);
      if (isDev) await writeDevSpec(context.generatedFilesDir, pluginId, spec);
      if (isDev && renderer.showDeveloperHints !== false) {
        renderer.spectralDiagnostics = [
          ...(renderer.spectralDiagnostics ?? []),
          ...(await runSpectral(spec)),
        ];
      }
      return {
        name: pluginId,
        spec,
        route,
        routeGeneration: options.routeGeneration ?? 'static',
        layout:
          options.layout === false
            ? false
            : { noFooter: options.layout?.noFooter ?? true },
        renderer,
      };
    },
    async contentLoaded({ content, actions }) {
      actions.setGlobalData({
        name: content.name,
        route: content.route,
        operations: operationCatalog(content.spec),
      } satisfies SpeccyPluginGlobalData);
      const component = fileURLToPath(new URL('./page.js', import.meta.url));
      const dataName =
        content.route.split('/').filter(Boolean).join('-') || 'root';
      const referenceDataPath = await actions.createData(
        `speccy-reference-${dataName}.json`,
        JSON.stringify({
          spec: content.spec,
          route: content.route,
          layout: content.layout,
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
