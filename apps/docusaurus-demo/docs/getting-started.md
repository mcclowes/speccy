---
sidebar_position: 1
title: Get started
description: Add Speccy to a React app or publish an OpenAPI reference with Docusaurus.
---

# Get started

Speccy renders OpenAPI 3.x and Swagger 2 documents as searchable reference documentation. Use the React package inside an existing app, or use the Docusaurus plugin to generate a complete reference route at build time.

## React

Install the renderer:

```sh
npm install @speccy/renderer
```

Pass it a parsed OpenAPI object, a YAML string, or a JSON string:

```tsx
import {Speccy} from '@speccy/renderer';
import '@speccy/renderer/styles.css';

export function ApiReference({spec}) {
  return <Speccy spec={spec} basePath="/api" />;
}
```

`basePath` should match the route where the reference is mounted. Speccy uses it to create stable links for endpoints, tags, and reusable components.

## Docusaurus

Install the plugin and renderer:

```sh
npm install @speccy/docusaurus @speccy/renderer
```

Add a generated reference route to `docusaurus.config.ts`:

```ts
export default {
  plugins: [
    [
      '@speccy/docusaurus',
      {
        route: '/api',
        spec: './static/openapi.yaml',
      },
    ],
  ],
};
```

Run your normal Docusaurus development server. The reference will be available at `/api`.

## What the spec needs

At minimum, provide an OpenAPI version and a path:

```yaml
openapi: 3.1.0
info:
  title: Library API
  version: 1.0.0
paths:
  /books:
    get:
      operationId: listBooks
      summary: List books
      responses:
        '200':
          description: Books in the catalog
```

Add tags to group operations and give each operation an `operationId`. Speccy can create an ID from the method and path, but an explicit ID keeps URLs stable when paths change.

## Next steps

- Use [the React renderer](./react-renderer.md) for component options and routing behavior.
- Use [the Docusaurus plugin](./docusaurus.md) for generated routes and MDX embeds.
- See [OpenAPI extensions](./openapi-extensions.md) for tag groups, longer introductions, and icons.
