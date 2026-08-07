# Speccy for Docusaurus

Speccy adds a clean OpenAPI reference to a Docusaurus 3 site. It can build a full reference route from a local file, a remote URL, or an inline document. The same renderer can be embedded in MDX.

## Install

```sh
npm install @mcclowes/speccy-docusaurus
```

Add the plugin to `docusaurus.config.ts`:

```ts
export default {
  plugins: [
    [
      '@mcclowes/speccy-docusaurus',
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
import {OpenAPI} from '@mcclowes/speccy-docusaurus/client';
import spec from '@site/static/openapi.json';

<OpenAPI spec={spec} />
```

Embedded references hide their internal sidebar by default. Set `showSidebar` to add it.
