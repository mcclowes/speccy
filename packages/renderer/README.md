# Speccy renderer

Render an OpenAPI 3.x or Swagger 2 document inside a React application. The package is published as [`speccy-renderer`](https://www.npmjs.com/package/speccy-renderer).

## Install

```sh
npm install speccy-renderer
```

## Use

```tsx
import { Speccy } from 'speccy-renderer';
import 'speccy-renderer/styles.css';

export function ApiReference({ spec }) {
  return <Speccy spec={spec} basePath="/api" />;
}
```

`spec` accepts a parsed object or a YAML/JSON string. Configure your host to serve the application shell for URLs beneath `basePath`, including direct links to operations, tags, and reusable components.

Set `tryIt={false}` to remove the interactive request builder, its generated request samples, and the ability to send API requests. Response documentation remains visible.

## Link guides to operations

Use the documentation components when prose needs to point readers into the API reference. They share the renderer's method badges, paths, themes, and code presentation:

```tsx
import {
  EndpointStrip,
  OperationCard,
  OperationLink,
  OperationPreview,
} from 'speccy-renderer/docs';

<p>
  Call{' '}
  <OperationLink
    method="post"
    path="/corporates"
    href="/api/create-corporate"
  />{' '}
  to create the identity.
</p>

<OperationCard
  method="post"
  path="/corporates"
  summary="Create a corporate identity"
  description="Creates the identity and its root user."
  href="/api/create-corporate"
/>
```

`EndpointStrip` presents the same operation as a full-width callout. `OperationPreview` adds request and optional response examples. Each component accepts a normal `href` and optional `onClick`, so it works with static links or client-side navigation.

Set `openApiUrl` when the rendered description is available at a public URL. The overview will link to it and offer a copy action, which gives users a stable URL to import into Postman and other API clients. Set `postmanCollectionUrl` to add a Run in Postman action for a public collection maintained by the API publisher.

```tsx
<Speccy
  spec={spec}
  openApiUrl="/api/openapi.yaml"
  postmanCollectionUrl="https://www.postman.com/example/collection"
/>
```

Mark any OpenAPI object with `x-internal: true` to omit it from the rendered reference. This works for operations, path items, webhooks, parameters, schema properties, and reusable components. The downloadable document is not yet filtered ([#34](https://github.com/mcclowes/speccy/issues/34)), so don't rely on the marker to keep internal surface out of a published download.

```yaml
paths:
  /admin/audit-log:
    get:
      x-internal: true
      summary: Read the audit log
```

Add `x-speccy-lifecycle` to an operation to show its release stage in the endpoint header and navigation. `new`, `coming-soon`, and `beta` have distinct styles. Other non-empty values are humanized and shown with a neutral style, so you can use your own lifecycle vocabulary.

```yaml
paths:
  /companies/export:
    post:
      summary: Export companies
      x-speccy-lifecycle: coming-soon
```

For `new` operations, add `x-speccy-lifecycle-since: YYYY-MM-DD` so change-aware linting can suggest removing the badge after the repository's configured age.

## Show API health guidance

Set `showDeveloperHints` in an internal or authoring view. Speccy adds contextual guidance and an API health drawer covering OAS correctness, documentation, operations, resource design, errors, authentication, pagination, data modeling, lifecycle design including webhook envelopes, and change safety.

```tsx
<Speccy spec={currentSpec} previousSpec={publishedSpec} showDeveloperHints />
```

The renderer doesn't run Spectral itself; hosts wire it up. The Docusaurus plugin and the web studio run Spectral's standard OAS ruleset and pass the results in. Do the same from your own Spectral run through `spectralDiagnostics`: Speccy preserves the rule ID, severity, object path, and source range, and labels these findings separately from its own design guidance.

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
import { adaptOasdiffChangelog, SpecDiff } from 'speccy-renderer';
import 'speccy-renderer/styles.css';

const report = adaptOasdiffChangelog(changes, {
  base: { source: 'base.yaml', version: '1.4.0' },
  revision: { source: 'revision.yaml', version: '2.0.0' },
});

export function ApiDiff() {
  return (
    <SpecDiff
      report={report}
      hrefForChange={(change) =>
        change.operationId ? `/api/${change.operationId}` : undefined
      }
    />
  );
}
```

The adapter maps oasdiff levels, rule IDs, operation details, fingerprints, and source locations. Use `operationMetadata` when you want to add tags or a more specific object location from your OpenAPI document. The view supports severity and area filters, text search, deep links, source locations, and expandable before-and-after values. Keeping comparison outside the component lets hosts use external diff engines like oasdiff and keeps remote `$ref` loading behind the host's security boundary.

See the [Speccy documentation](https://github.com/mcclowes/speccy#readme) for renderer options, Docusaurus integration, and standalone reference sites.
