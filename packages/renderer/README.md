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

See the [Speccy documentation](https://github.com/mcclowes/speccy#readme) for renderer options, Docusaurus integration, and standalone reference sites.
