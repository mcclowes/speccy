# speccy-spectral

Runs Stoplight Spectral's standard OAS ruleset and returns results in the shape Speccy consumes. Spectral and its rulesets are heavyweight, so this integration stays out of [`speccy-renderer`](https://www.npmjs.com/package/speccy-renderer) and [`speccy-cli`](https://www.npmjs.com/package/speccy-cli); hosts opt in by installing this package.

```sh
npm install speccy-spectral
```

## Use

```ts
import { runSpectral } from 'speccy-spectral';

const diagnostics = await runSpectral(source);
```

`runSpectral` accepts a parsed OpenAPI document or raw YAML/JSON source text and resolves to `SpectralDiagnosticInput[]`: `{ code, message, severity, path, range }` for each finding. Pass source text rather than a parsed object to preserve source ranges.

The result drops straight into `speccy-core`'s `analyzeOpenApi(document, { spectral })` or the renderer's `spectralDiagnostics` prop:

```tsx
<Speccy spec={source} showDeveloperHints spectralDiagnostics={diagnostics} />
```

## How Speccy uses it

The Docusaurus plugin imports it at build time and merges the output into the generated route's diagnostics during development builds, unless the route sets `renderer.showDeveloperHints: false`. The web studio imports it lazily in the browser so Spectral never lands in the initial bundle. Both patterns work: the package ships ESM and CJS builds and runs in Node and the browser.

## Scope

The standard OAS ruleset only; there is no custom-ruleset or `.spectral.yaml` support. For custom rules, run Spectral yourself and pass the results through the same `SpectralDiagnosticInput` shape.

[Decision 001](https://github.com/mcclowes/speccy/blob/main/docs/decisions/001-public-package-surface.md) plans to fold this package into its consumers ([#31](https://github.com/mcclowes/speccy/issues/31)). Prefer the renderer's `spectralDiagnostics` prop as the stable seam.

## License

MIT
