# speccy-core

Headless OpenAPI parsing, analysis, and diffing. This is the engine behind [`speccy-renderer`](https://www.npmjs.com/package/speccy-renderer), with no React and no DOM, so it runs in Node, in CI, and in the browser.

```sh
npm install speccy-core
```

## Parse and model

```ts
import { parseSpec, createReferenceModel } from 'speccy-core';

const document = parseSpec(yamlOrJsonString);
const model = createReferenceModel(document);
```

`parseSpec` parses YAML or JSON and returns the document untouched. `createReferenceModel` normalizes it, including Swagger 2 hosts, definitions, security definitions, and body parameters, resolves references, and returns the tags, operations, and navigation structure the renderer draws. Call `normalizeDocument` directly when you want the normalized document without the model.

## Analyze

```ts
import { analyzeOpenApi } from 'speccy-core';

const findings = analyzeOpenApi(document);
```

Returns `ApiDiagnostic[]` across OAS correctness, documentation, operations, resource design, errors, authentication, pagination, data modeling, and lifecycle. Pass `previousDocument` to add change-safety findings, or `spectral` to fold Spectral results into the same list.

## Diff

```ts
import { diffSpecs } from 'speccy-core';

const report = diffSpecs(baseDocument, revisionDocument);
```

`diffSpecs` produces a `DiffReport` natively. It is the engine behind `speccy diff` and the change-safety diagnostics.

When the comparison happens outside JavaScript, `adaptOasdiffChangelog` converts `oasdiff changelog --format json` output into the same contract:

```ts
import { adaptOasdiffChangelog } from 'speccy-core';

const report = adaptOasdiffChangelog(changelogJson);
```

## License

MIT
