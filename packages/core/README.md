# @speccy/core

Headless OpenAPI parsing, analysis, and diffing. This is the engine behind [`speccy-renderer`](https://www.npmjs.com/package/speccy-renderer), with no React and no DOM, so it runs in Node, in CI, and in the browser.

```sh
npm install @speccy/core
```

## Parse and model

```ts
import {parseSpec, createReferenceModel} from '@speccy/core';

const document = parseSpec(yamlOrJsonString);
const model = createReferenceModel(document);
```

`parseSpec` accepts OpenAPI 3.x and Swagger 2 in YAML or JSON, and normalizes Swagger 2 hosts, definitions, security definitions, and body parameters. `createReferenceModel` resolves references and returns the tags, operations, and navigation structure the renderer draws.

## Analyze

```ts
import {analyzeOpenApi} from '@speccy/core';

const findings = analyzeOpenApi(document);
```

Returns `ApiDiagnostic[]` across documentation, operations, resource design, errors, authentication, pagination, data modeling, and lifecycle. Pass `previousDocument` to add change-safety findings, or `spectral` to fold Spectral results into the same list.

## Diff

```ts
import {adaptOasdiffChangelog} from '@speccy/core';

const report = adaptOasdiffChangelog(changelogJson);
```

Converts `oasdiff changelog --format json` output into the `DiffReport` contract that `SpecDiff` renders.

## License

MIT
