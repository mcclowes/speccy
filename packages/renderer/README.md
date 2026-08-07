# Speccy renderer

Render an OpenAPI 3.x or Swagger 2 document inside a React application. The package is published as [`speccy-renderer`](https://www.npmjs.com/package/speccy-renderer).

## Install

```sh
npm install speccy-renderer
```

## Use

```tsx
import {Speccy} from 'speccy-renderer';
import 'speccy-renderer/styles.css';

export function ApiReference({spec}) {
  return <Speccy spec={spec} basePath="/api" />;
}
```

`spec` accepts a parsed object or a YAML/JSON string. Configure your host to serve the application shell for URLs beneath `basePath`, including direct links to operations, tags, and reusable components.

Mark any OpenAPI object with `x-internal: true` to omit it from the rendered reference and downloadable document. This works for operations, path items, webhooks, parameters, schema properties, and reusable components.

```yaml
paths:
  /admin/audit-log:
    get:
      x-internal: true
      summary: Read the audit log
```

## Show API health guidance

Set `showDeveloperHints` in an internal or authoring view. Speccy adds contextual guidance and an API health drawer covering OAS correctness, documentation, operations, resource design, errors, authentication, pagination, data modeling, lifecycle design, webhooks, and change safety.

```tsx
<Speccy
  spec={currentSpec}
  previousSpec={publishedSpec}
  showDeveloperHints
/>
```

Speccy runs Spectral's standard OAS ruleset automatically. Pass additional results from your own configured Spectral run through `spectralDiagnostics`. Speccy preserves the rule ID, severity, object path, and source range, and labels these findings separately from its own design guidance.

```tsx
<Speccy spec={spec} showDeveloperHints spectralDiagnostics={spectralResults} />
```

Developer hints are off by default, excluded from print output, and should stay off in public preview links. Ignored rules are stored locally for each rendered API. `previousSpec` enables checks for removed operations and responses, new required inputs, narrowed enums, response-shape changes, and stricter authentication.

## Present an API diff

`SpecDiff` presents a normalized semantic diff produced outside the browser. Speccy includes an adapter for the stable JSON emitted by `oasdiff changelog`:

```sh
oasdiff changelog base.yaml revision.yaml --format json > changes.json
```

```tsx
import {adaptOasdiffChangelog, SpecDiff} from 'speccy-renderer';
import 'speccy-renderer/styles.css';

const report = adaptOasdiffChangelog(changes, {
  base: {source: 'base.yaml', version: '1.4.0'},
  revision: {source: 'revision.yaml', version: '2.0.0'},
});

export function ApiDiff() {
  return (
    <SpecDiff
      report={report}
      hrefForChange={(change) => change.operationId ? `/api/${change.operationId}` : undefined}
    />
  );
}
```

The adapter maps oasdiff levels, rule IDs, operation details, fingerprints, and source locations. Use `operationMetadata` when you want to add tags or a more specific object location from your OpenAPI document. The view supports severity and area filters, text search, deep links, source locations, and expandable before-and-after values. Keeping comparison outside the component avoids shipping a platform-specific diff engine to the browser and keeps remote `$ref` loading behind the host's security boundary.

See the [Speccy documentation](https://github.com/mcclowes/speccy#readme) for renderer options, Docusaurus integration, and standalone reference sites.
