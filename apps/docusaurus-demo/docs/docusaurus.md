---
title: Docusaurus
description: Generate an API reference route or embed Speccy directly in an MDX page.
---

# Docusaurus

`docusaurus-plugin-speccy` supports a generated route and an embeddable component. Both use the same renderer and accept the same visual options, with different defaults: the generated route shows the sidebar and theme toggle, while the embedded component hides them and inherits the site theme.

Install the [plugin](https://www.npmjs.com/package/docusaurus-plugin-speccy):

```sh
npm install docusaurus-plugin-speccy
```

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

The document is loaded during the Docusaurus build. A missing file fails the build; a document that doesn't parse renders an in-page error instead of an empty reference.

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
import { OpenAPI } from 'docusaurus-plugin-speccy/client';
import spec from '@site/static/openapi.json';

<OpenAPI spec={spec} />
```

The component defaults to an embedded layout and hides its internal sidebar; set `showSidebar` to add it back. You can pass any renderer option, including `theme`, `accentColor`, `logo`, and `basePath`.

Set `renderer.tryIt` to `false` for a generated route, or pass `tryIt={false}` to `OpenAPI`, to publish static request documentation without allowing live API requests.

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
