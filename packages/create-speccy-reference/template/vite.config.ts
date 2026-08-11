import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import referenceConfig from './speccy.config';

const virtualId = 'virtual:speccy-reference';
const resolvedVirtualId = `\0${virtualId}`;

type ReferenceConfig = typeof referenceConfig & {
  spec: string;
  specUrl?: string;
  openApiUrl?: string;
  postmanCollectionUrl?: string;
};

function publicOpenApiUrl(basePath: string): string {
  return `${basePath.endsWith('/') ? basePath : `${basePath}/`}openapi.yaml`;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );
}

function referencePlugin(config: ReferenceConfig): Plugin {
  let specPromise: Promise<string> | undefined;
  const loadSpec = () =>
    (specPromise ??= config.specUrl
      ? fetch(config.specUrl).then((response) => {
          if (!response.ok)
            throw new Error(
              `Could not load ${config.specUrl}: ${response.status} ${response.statusText}`,
            );
          return response.text();
        })
      : readFile(
          isAbsolute(config.spec)
            ? config.spec
            : resolve(process.cwd(), config.spec),
          'utf8',
        ));

  return {
    name: 'speccy-reference',
    resolveId(id) {
      return id === virtualId ? resolvedVirtualId : undefined;
    },
    async load(id) {
      if (id !== resolvedVirtualId) return undefined;
      const spec = await loadSpec();
      const publicConfig = {
        ...config,
        openApiUrl: config.openApiUrl ?? publicOpenApiUrl(config.basePath),
      };
      return `export const spec = ${JSON.stringify(spec)}; export const config = ${JSON.stringify(publicConfig)};`;
    },
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'openapi.yaml',
        source: await loadSpec(),
      });
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = request.url?.split('?', 1)[0];
        if (pathname !== publicOpenApiUrl(config.basePath)) return next();
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/yaml; charset=utf-8');
        response.end(await loadSpec());
      });
    },
    transformIndexHtml(html) {
      const title = escapeHtml(config.title);
      return html
        .replace('<title>API reference</title>', `<title>${title}</title>`)
        .replace('content="API reference"', `content="${title} API reference"`);
    },
  };
}

export default defineConfig({
  base: referenceConfig.basePath,
  plugins: [react(), referencePlugin(referenceConfig)],
  build: { sourcemap: true },
});
