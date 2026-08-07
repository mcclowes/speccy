# Speccy for Docusaurus

Speccy adds a clean OpenAPI reference to a Docusaurus 3 site. It can build a full reference route from a local file, a remote URL, or an inline document. The same renderer can be embedded in MDX. The package is published as [`docusaurus-plugin-speccy`](https://www.npmjs.com/package/docusaurus-plugin-speccy).

## Install

```sh
npm install docusaurus-plugin-speccy speccy-renderer
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
          theme: 'system',
        },
      },
    ],
  ],
};
```

The reference is now available at `/api`.

To embed a reference in MDX:

```mdx
import {OpenAPI} from 'docusaurus-plugin-speccy/client';
import spec from '@site/static/openapi.json';

<OpenAPI spec={spec} />
```

Embedded references hide their internal sidebar by default. Set `showSidebar` to add it.

Generated references show Speccy's API health guidance during local Docusaurus development and hide it in production builds. Override this with `renderer.showDeveloperHints` when you need explicit control. You can also pass `previousSpec` and `spectralDiagnostics` through the renderer options.
