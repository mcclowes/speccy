# Speccy

Speccy is an OpenAPI renderer for React, the web, macOS, and Docusaurus. It uses one rendering core across every surface, so a spec looks and behaves the same wherever it is published.

The design stays quiet around the content. Color identifies methods, status, required fields, and interactive state rather than decorating every surface.

## What’s included

- [`@speccy/core`](https://www.npmjs.com/package/@speccy/core) - headless parsing, analysis, and diffing with no React and no DOM
- [`@speccy/cli`](https://www.npmjs.com/package/@speccy/cli) - `speccy lint` and `speccy diff` for CI
- [`speccy-renderer`](https://www.npmjs.com/package/speccy-renderer) - the shared React renderer
- `@speccy/web` - a standalone studio with file, URL, paste, drag-and-drop, and theme controls
- [`docusaurus-plugin-speccy`](https://www.npmjs.com/package/docusaurus-plugin-speccy) - generated reference routes and an embeddable MDX component
- [`create-speccy-reference`](https://www.npmjs.com/package/create-speccy-reference) - a standalone static reference starter
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

```sh
npm install speccy-renderer
```

```tsx
import {Speccy} from 'speccy-renderer';
import 'speccy-renderer/styles.css';

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

```sh
npm install docusaurus-plugin-speccy speccy-renderer
```

```ts
// docusaurus.config.ts
export default {
  plugins: [
    [
      'docusaurus-plugin-speccy',
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
import {OpenAPI} from 'docusaurus-plugin-speccy/client';
import spec from '@site/static/openapi.json';

<OpenAPI spec={spec} />
```

## Publish a standalone reference

Use the standalone starter when the API reference is the whole site:

```sh
npm create speccy-reference my-api-reference
cd my-api-reference
npm install
npm run dev
```

The generated project keeps its OpenAPI source, branding, and base path in `speccy.config.ts`. `npm run build` produces static assets for Cloudflare Pages, Netlify, Vercel, S3, or another static host. Use Docusaurus instead when the site also needs guides, tutorials, or other prose documentation.

## Review an API in CI

```sh
npx @speccy/cli diff origin/main:openapi.yaml openapi.yaml
```

Exits 1 on a breaking change, 0 otherwise, and 2 if the tool itself could not run. `speccy lint openapi.yaml` reports documentation, design, error, auth, pagination, and data modeling problems from the same rule set the renderer shows in its developer view. Add `--format markdown` for output ready to post as a pull request comment.

Each spec argument accepts a file path, a git ref, or an https URL. See [`packages/cli`](packages/cli/README.md) for the full options.

## Check everything

```sh
npm run check
```

This typechecks every TypeScript package, runs the renderer, plugin, and studio tests, builds all packages, and performs a real Docusaurus production build. Run `npm run build:mac` separately for the native target.

## Develop and test the renderer UI

Run the renderer stories in Storybook:

```sh
npm run storybook
```

The stories cover representative overview and endpoint states in light, dark, desktop, and mobile layouts. Build the static Storybook with `npm run build:storybook`.

Playwright compares those stories with committed screenshots:

```sh
npx playwright install chromium
npm run test:visual
```

When a deliberate UI change affects a baseline, review the diff and update it with `npm run test:visual -- --update-snapshots`.

The screenshot set is small, so it stays in regular Git. Git LFS would add an extra install and download requirement for contributors and source checkouts without saving meaningful repository space. Revisit that choice if the baseline set grows into tens of megabytes.

## Project structure

```text
apps/
  web/                Standalone Vite studio
  macos/              Native SwiftUI shell and packager
  docusaurus-demo/    Integration fixture
packages/
  core/               Headless parser, model, diagnostics, and diff engine
  cli/                speccy lint and speccy diff
  renderer/           Shared React UI and styles
  docusaurus-plugin/  Docusaurus build plugin and MDX component
  create-speccy-reference/ Standalone reference project generator
```
