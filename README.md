# Speccy

Speccy is an OpenAPI renderer for React, the web, macOS, and Docusaurus. It uses one rendering core across every surface, so a spec looks and behaves the same wherever it is published.

The design stays quiet around the content. Color identifies methods, status, required fields, and interactive state rather than decorating every surface.

## Choose an entry point

- [`speccy-cli`](https://www.npmjs.com/package/speccy-cli) - `speccy lint` and `speccy diff` for CI
- [`speccy-renderer`](https://www.npmjs.com/package/speccy-renderer) - the shared React renderer
- [`docusaurus-plugin-speccy`](https://www.npmjs.com/package/docusaurus-plugin-speccy) - generated reference routes and an embeddable MDX component
- [`create-speccy-reference`](https://www.npmjs.com/package/create-speccy-reference) - a standalone static reference starter

[`speccy-core`](https://www.npmjs.com/package/speccy-core) provides the headless parsing, analysis, and diffing API for advanced integrations. Most users don't need to install it directly.

The repository also contains `@speccy/web`, the standalone studio, and `apps/macos`, the offline SwiftUI and WebKit app.

See the [public package decision](docs/decisions/001-public-package-surface.md) for how these entry points map to the internal packages.

## What’s included

- `apps/macos` - an offline SwiftUI and WebKit Mac app with native Open, Reload, and Print commands
- `apps/docusaurus-demo` - a production-build integration fixture

Speccy supports the complete OpenAPI 3.1.1 document vocabulary in YAML or JSON, including JSON Schema 2020-12, multi-document references, request serialization, and every reusable component type. The web studio and Mac app resolve multi-document references automatically; the React component renders a single document, so bundle external references first with `speccy-core`. See the [OpenAPI 3.1.1 conformance matrix](docs/openapi-3.1.1-conformance.md) for the tested scope and the precise boundary of that claim.

Speccy also accepts other OpenAPI 3.x descriptions and Swagger 2 documents. Swagger 2 hosts, definitions, security definitions, body and form parameters, and response schemas are normalized automatically.

## Run the web studio

```sh
npm install
npm run dev
```

Vite prints the local URL. Open a `.yaml`, `.yml`, or `.json` document, paste source directly, or load a URL. Use the share button to copy a clean preview link without the studio controls. Remote documents stay linked to their source URL; local and pasted documents are included in the link itself.

## Build the Mac app

```sh
npm run build:mac
```

The build runs the renderer and web builds, embeds the resulting assets, runs the Swift tests, and creates and opens an unsigned local app at `apps/macos/Speccy.app`. Distribution outside your machine still requires your Apple signing and notarization identity.

## Use the React renderer

```sh
npm install speccy-renderer
```

```tsx
import { Speccy } from 'speccy-renderer';
import 'speccy-renderer/styles.css';

export function Reference({ spec }) {
  return <Speccy spec={spec} accentColor="#6d5dfc" theme="system" />;
}
```

`spec` can be a parsed object or a YAML/JSON string. Options also include `showSidebar`, `showApiVersion`, `singleExpandedSidebarGroup`, `showThemeToggle`, `logo`, `className`, and `onError`; the [configuration reference](apps/docusaurus-demo/docs/configuration.md) documents the wider set, including navigation control and developer hints.

Set `tryIt={false}` to publish static request documentation without the interactive request builder, its generated request samples, or live API calls. Shared web preview links accept `tryIt=0` for the same behavior.

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
npm install docusaurus-plugin-speccy
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
        renderer: { accentColor: '#6d5dfc' },
      },
    ],
  ],
};
```

Use `specUrl` instead of `spec` to fetch a remote document at build time. For MDX embedding:

```mdx
import { OpenAPI } from 'docusaurus-plugin-speccy/client';
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

The generated project keeps its OpenAPI source, branding, and base path in `speccy.config.ts`. `npm run build` produces static assets for Cloudflare Pages, Netlify, Vercel, S3, or another static host; configure the host to serve `index.html` for unknown paths so direct links to operations work (Netlify and Vercel configs are included). Use Docusaurus instead when the site also needs guides, tutorials, or other prose documentation.

## Review an API in CI

```sh
npx speccy-cli diff origin/main:openapi.yaml openapi.yaml
```

Exits 1 on a breaking change, 0 otherwise, and 2 if the tool itself could not run. `speccy lint openapi.yaml` checks nine rule categories covering OpenAPI conformance, documentation, operations, resource design, errors, auth, pagination, data modeling, and lifecycle, the same Speccy rules the renderer shows in its developer view; `--against` adds the tenth, change safety, by comparing with a previous revision. Add `--format markdown` for output ready to post as a pull request comment.

Each spec argument accepts a file path, a git ref, or an http or https URL. See [`packages/cli`](packages/cli/README.md) for the full options.

Speccy's own CI dogfoods this command on pull requests. It builds the CLI from the proposed changes, compares the repository's managed cards example with the base branch, and publishes the Markdown report in the workflow summary.

For several specs and a persistent pull request comment, use the GitHub Action:

```yaml
on: pull_request

permissions:
  contents: read
  pull-requests: write

steps:
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
  - uses: mcclowes/speccy@v1
    with:
      specs: |
        Admin=reference/admin.yml
        Multi=reference/multi.yml
```

Each document is compared with the same path on the pull request's base branch. The Action runs the published `speccy-cli`, diffs each document, lints each revision for API health findings, writes the combined report to the workflow summary, updates its existing pull request comment, and fails on breaking changes. It only runs on `pull_request` events, and the repository remains responsible for generating any spec files before this step. The `version`, `fail-on`, `health-fail-on`, `comment`, and `github-token` inputs adjust the defaults; see [action.yml](action.yml).

Generated documents can provide their base and revision artifacts explicitly:

```yaml
with:
  specs: |
    Admin=.speccy/base/_build/admin.yml => _build/admin.yml
    Multi=.speccy/base/_build/multi.yml => _build/multi.yml
```

This form reads both artifacts straight from the checkout, so it works without `fetch-depth: 0`.

## Check everything

```sh
npm run check
```

This lints, format-checks, and typechecks the repository, runs every package and Action test suite, builds all packages, and performs a real Docusaurus production build. Run `npm run build:mac` separately for the native target.

Package changes use Changesets for versions and changelogs. See the [release checklist](docs/releases.md) for npm provenance, GitHub releases, and maintenance of the `v1` Action tag.

## Develop and test the renderer UI

Run the renderer stories in Storybook:

```sh
npm run storybook
```

The stories cover representative overview and endpoint states in light and dark themes. Build the static Storybook with `npm run build:storybook`.

Playwright captures those stories at desktop, tablet, and mobile sizes and compares them with committed screenshots:

```sh
npx playwright install chromium
npm run test:visual
```

When a deliberate UI change affects a baseline, review the diff and update it with `npm run test:visual -- --update-snapshots`.

The screenshot set is small, so it stays in regular Git. Git LFS would add an extra install and download requirement for contributors and source checkouts without saving meaningful repository space. Revisit that choice if the baseline set grows into tens of megabytes.

## Project structure

```text
action.yml            GitHub Action definition
action/               Action implementation wrapping speccy-cli
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
  spectral/           Optional Spectral linting integration
docs/                 Conformance matrix, decision records, release checklist
test-fixtures/        Consumer project used by the Action's CI test
```
