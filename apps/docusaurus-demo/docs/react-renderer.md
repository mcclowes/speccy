---
title: React renderer
description: Render a complete OpenAPI reference inside a React application.
---

# React renderer

`speccy-renderer` is the shared rendering core. It owns parsing, navigation, search, endpoint pages, request samples, and the request builder.

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

The renderer fills its parent. Give the surrounding layout enough height for the sidebar and content.

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
```

Operation URLs use the slugified `operationId` (or an ID derived from the method and path). Individual reusable components are anchors within their section page rather than routes of their own.

Configure your host to serve the React application for these routes. Static hosts usually call this an SPA fallback or rewrite.

## Branding

Use `logo` for the brand mark in the sidebar header:

```tsx
<Speccy spec={spec} logo={<img src="/mark.svg" alt="Acme" />} />
```

The API title comes from `info.title`. Use the [`x-icon` extension](./openapi-extensions.md#tag-icons) for icons beside individual tags.
