# Speccy

Speccy is an OpenAPI renderer for React, the web, macOS, and Docusaurus. It uses one rendering core across every surface, so a spec looks and behaves the same wherever it is published.

The design stays quiet around the content. Color identifies methods, status, required fields, and interactive state rather than decorating every surface.

## What’s included

- `@speccy/renderer` - the shared React renderer
- `@speccy/web` - a standalone studio with file, URL, paste, drag-and-drop, and theme controls
- `@speccy/docusaurus` - generated reference routes and an embeddable MDX component
- `apps/macos` - an offline SwiftUI and WebKit Mac app with native Open, Reload, and Print commands
- `apps/docusaurus-demo` - a production-build integration fixture

The renderer accepts OpenAPI 3.x and Swagger 2 documents in YAML or JSON. It covers info, all servers and media types, tags, operations, parameters, request and response bodies, webhooks, callbacks, security requirements and schemes, headers, links, examples, reusable component catalogues, nested schemas, composition, enums, references, deprecation, search, cURL samples, dark mode, responsive layouts, and print styles. Swagger 2 hosts, definitions, security definitions, body and form parameters, and response schemas are normalized automatically.

## Run the web studio

```sh
npm install
npm run dev
```

Vite prints the local URL. Open a `.yaml`, `.yml`, or `.json` document, paste source directly, or load a URL. Use the share button to copy a clean preview link without the studio controls. Remote documents stay linked to their source URL; local and pasted documents are included in the link itself.

## Build the Mac app

```sh
npm run build:mac
open apps/macos/Speccy.app
```

The build runs the renderer and web builds, embeds the resulting assets, runs the Swift tests, and creates an unsigned local app at `apps/macos/Speccy.app`. Distribution outside your machine still requires your Apple signing and notarization identity.

## Use the React renderer

```tsx
import {Speccy} from '@speccy/renderer';
import '@speccy/renderer/styles.css';

export function Reference({spec}) {
  return <Speccy spec={spec} accentColor="#6d5dfc" theme="system" />;
}
```

`spec` can be a parsed object or a YAML/JSON string. The public options also include `showSidebar`, `defaultExpanded`, `logo`, `className`, and `onError`.

Tags can display an icon in the sidebar and tag headings with Speccy's `x-icon` extension:

```yaml
tags:
  - name: Lending
    x-icon:
      url: /icons/lending.svg
      alt: Lending
```

`url` accepts any image URL supported by the browser. Keep `alt` empty when the icon is purely decorative.

## Use the Docusaurus plugin

```ts
// docusaurus.config.ts
export default {
  plugins: [
    [
      '@speccy/docusaurus',
      {
        route: '/api',
        spec: './static/openapi.yaml',
        renderer: {accentColor: '#6d5dfc'},
      },
    ],
  ],
};
```

Use `specUrl` instead of `spec` to fetch a remote document at build time. For MDX embedding:

```mdx
import {OpenAPI} from '@speccy/docusaurus/client';
import spec from '@site/static/openapi.json';

<OpenAPI spec={spec} />
```

## Check everything

```sh
npm run check
```

This typechecks every TypeScript package, runs the renderer, plugin, and studio tests, builds all packages, and performs a real Docusaurus production build. Run `npm run build:mac` separately for the native target.

## Project structure

```text
apps/
  web/                Standalone Vite studio
  macos/              Native SwiftUI shell and packager
  docusaurus-demo/    Integration fixture
packages/
  renderer/           Shared parser, model, React UI, and styles
  docusaurus-plugin/  Docusaurus build plugin and MDX component
```
