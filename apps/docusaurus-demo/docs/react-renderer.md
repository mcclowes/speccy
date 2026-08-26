---
title: React renderer
description: Render a complete OpenAPI reference inside a React application.
---

# React renderer

`speccy-renderer` is the shared rendering core. It owns parsing, navigation, search, endpoint pages, request samples, and the request builder.

See [Test API requests](./test-api-requests.md) for how the request builder handles servers, authorization, parameters, bodies, and browser calls. Use [Review API health](./api-health.md) when the renderer is part of an internal authoring or review view.

Install it from [npm](https://www.npmjs.com/package/speccy-renderer):

```sh
npm install speccy-renderer
```

## Basic use

```tsx
import { Speccy } from 'speccy-renderer';
import 'speccy-renderer/styles.css';

export function Reference() {
  return (
    <Speccy
      spec={openApiDocument}
      basePath="/reference"
      accentColor="#6d5dfc"
      theme="system"
    />
  );
}
```

The renderer fills its parent. Give the surrounding layout enough height for the sidebar and content. When a route opens an endpoint, Speccy scrolls its own sidebar to the active item without changing the host page's scroll position.

Object schemas use a field explorer. Selecting a field opens its description, constraints, examples, and accepted `oneOf` or `anyOf` shapes. Expand an accepted shape to inspect its fields without leaving the parent schema.

Properties can use a single-member `allOf` wrapper to add a local description or deprecation marker to a reusable schema. The field explorer retains the referenced schema's allowed values, format, pattern, numeric bounds, length limits, and example while honoring any constraint set directly on the property.

A schema that accepts several shapes lists them at its root too, so a polymorphic request or response body never presents one branch as the whole contract. When a `discriminator` is present, the explorer names the property that selects the shape and labels each shape with the mapped value that chooses it. Open-ended objects show their `patternProperties` and `additionalProperties` beside the declared ones, and a closed object says so. Schemas that use conditional keywords — `if`, `then`, `else`, `not`, `$defs`, `prefixItems`, `contains`, `propertyNames`, `dependentSchemas`, or the `unevaluated*` pair — render as a nested schema tree instead of the explorer, which keeps every keyword visible.

Operation parameters replace the path-level parameters they repeat, matching the OpenAPI rule that a path parameter can be overridden but not removed. An operation listed under several tags appears under each of them.

Use the [operation components](./operation-components.mdx) when a guide or tutorial needs to link readers to individual endpoints without embedding the full reference.

## Loading a document

Fetch and parse the document yourself when you need loading states, authentication, caching, or custom error handling:

```tsx
const [spec, setSpec] = useState<object>();

useEffect(() => {
  fetch('/openapi.json')
    .then((response) => response.json())
    .then(setSpec);
}, []);

return spec ? <Speccy spec={spec} basePath="/api" /> : <p>Loading…</p>;
```

Speccy also accepts raw YAML and JSON strings. Parsing errors are rendered in place and passed to `onError` when provided.

## Routing

Speccy uses the browser history API and creates routes beneath `basePath`:

```text
/api                     API overview
/api/list-books          Operation, from the slugified operationId
/api/tags/books          Tag overview
/api/reference/schemas   Reusable schemas section
/api/reference/webhooks  Every webhook in one list
```

Operation URLs use the slugified `operationId` (or an ID derived from the method and path). Individual reusable components are anchors within their section page rather than routes of their own.

## Webhooks

Webhooks declared under the document's top-level `webhooks` key appear in the sidebar under their tag, alongside the operations that share it, and untagged webhooks group under **Other webhooks**. They also get a page of their own at `/reference/webhooks`, listing every webhook the API delivers in one place. The page and its sidebar entry only appear when the spec declares webhooks.

Configure your host to serve the React application for these routes. Static hosts usually call this an SPA fallback or rewrite.

## Branding

Use `logo` for the brand mark in the sidebar header:

```tsx
<Speccy spec={spec} logo={<img src="/mark.svg" alt="Acme" />} />
```

The API title comes from `info.title`. Use the [`x-icon` extension](./openapi-extensions.md#tag-icons) for icons beside individual tags.

The overview groups `info.termsOfService`, `info.contact`, `info.license`, and top-level `externalDocs` into a compact API information panel beneath the description. Omitted fields don't leave empty rows.
