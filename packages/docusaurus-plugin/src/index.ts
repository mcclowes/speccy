/**
 * ---
 * purpose: Implements the Docusaurus build plugin and turns OpenAPI sources into generated reference routes.
 * related:
 *   - ./page.tsx - Route component that receives the generated spec data.
 *   - ./client.tsx - Public component for direct MDX and React embedding.
 * ---
 */

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LoadContext, Plugin } from '@docusaurus/types';
import type { OpenAPIDocument, SpeccyProps } from '@speccy/renderer';

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
    if (!response.ok) throw new Error(`Could not load OpenAPI document from ${options.specUrl}: ${response.status} ${response.statusText}`);
    return response.text();
  }
  if (typeof options.spec === 'string') {
    const path = isAbsolute(options.spec) ? options.spec : resolve(siteDir, options.spec);
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
      return [require.resolve('@speccy/renderer/styles.css')];
    },
    async loadContent() {
      return {
        spec: await loadSpec(options, context.siteDir),
        route: normalizeRoute(options.route),
        renderer: options.renderer ?? {},
      };
    },
    async contentLoaded({ content, actions }) {
      const dataPath = await actions.createData('speccy-reference.json', JSON.stringify({
        spec: content.spec,
        renderer: content.renderer,
      }));
      actions.addRoute({
        path: content.route,
        exact: true,
        component: fileURLToPath(new URL('./page.js', import.meta.url)),
        modules: { reference: dataPath },
      });
    },
  };
}
