# Speccy for Docusaurus

Speccy adds a clean OpenAPI reference to a Docusaurus 3 site. It can build a full reference route from a local file or a remote URL, and the same renderer can be embedded in MDX with an inline document. The package is published as [`docusaurus-plugin-speccy`](https://www.npmjs.com/package/docusaurus-plugin-speccy).

## Install

```sh
npm install docusaurus-plugin-speccy
```

Add the plugin to `docusaurus.config.ts`:

```ts
export default {
  plugins: [
    [
      'docusaurus-plugin-speccy',
      {
        route: '/api',
        spec: './static/openapi.yaml',
        renderer: {
          accentColor: '#6d5dfc',
        },
      },
    ],
  ],
};
```

The reference is now available at `/api`. Use `specUrl` in place of `spec` to fetch a remote document at build time; the build environment must be able to reach that URL.

To embed a reference in MDX:

```mdx
import { OpenAPI } from 'docusaurus-plugin-speccy/client';
import spec from '@site/static/openapi.json';

<OpenAPI spec={spec} />
```

Embedded references hide their internal sidebar by default. Set `showSidebar` to add it.

Set `renderer.tryIt` to `false` on a generated route, or pass `tryIt={false}` to an embedded `OpenAPI` component, to hide the request builder and prevent visitors from sending requests.

Speccy follows Docusaurus's selected color mode, typography, and base font size by default. Set `renderer.theme` or `renderer.showThemeToggle` if the reference needs its own theme controls instead.

Generated references show Speccy's API health guidance during local Docusaurus development and hide it in production builds. Override this with `renderer.showDeveloperHints` when you need explicit control; note the plugin only runs Spectral during development builds, so forcing hints on in production shows Speccy's own guidance without Spectral findings. You can also pass `previousSpec` and `spectralDiagnostics` through the renderer options.
