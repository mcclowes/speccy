---
title: Docusaurus
description: Generate an API reference route or embed Speccy directly in an MDX page.
---

# Docusaurus

`docusaurus-plugin-speccy` supports a generated route and an embeddable component. Both use the same renderer and accept the same visual options.

## Generate a reference route

Point the plugin at a local document:

```ts title="docusaurus.config.ts"
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

The document is loaded during the Docusaurus build. A missing or invalid file fails the build instead of publishing an empty reference.

Use `specUrl` in place of `spec` to fetch a remote document at build time:

```ts
{
  route: '/api',
  specUrl: 'https://api.example.com/openapi.json',
}
```

The build environment must be able to reach that URL.

## Embed in MDX

Use the client component when the reference belongs inside a guide or a custom docs layout:

```mdx
import {OpenAPI} from 'docusaurus-plugin-speccy/client';
import spec from '@site/static/openapi.json';

<OpenAPI spec={spec} showSidebar={false} />
```

The component defaults to an embedded layout. You can pass any renderer option, including `theme`, `accentColor`, `logo`, and `basePath`.

## Add it to navigation

The generated route behaves like any other Docusaurus page:

```ts
themeConfig: {
  navbar: {
    items: [
      {to: '/docs/getting-started', label: 'Guides'},
      {to: '/api', label: 'API reference'},
    ],
  },
}
```

This documentation site uses the same setup. Its [live API example](/api) is also the plugin’s production-build fixture.
