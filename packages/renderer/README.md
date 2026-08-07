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

## Present an API diff

`SpecDiff` presents a normalized semantic diff produced by a tool such as [oasdiff](https://github.com/oasdiff/oasdiff). Run the comparison outside the browser, translate its machine-readable output into a `DiffReport`, then pass the report to the renderer:

```tsx
import {SpecDiff, type DiffReport} from 'speccy-renderer';
import 'speccy-renderer/styles.css';

export function ApiDiff({report}: {report: DiffReport}) {
  return (
    <SpecDiff
      report={report}
      hrefForChange={(change) => change.operationId ? `/api/${change.operationId}` : undefined}
    />
  );
}
```

The view summarizes breaking, warning, compatible, and documentation changes. Changes can be filtered, are grouped by tag, and expose their before and after values. Keeping comparison outside the component avoids shipping a platform-specific diff engine to the browser and keeps remote `$ref` loading behind the host's security boundary.

See the [Speccy documentation](https://github.com/mcclowes/speccy#readme) for renderer options, Docusaurus integration, and standalone reference sites.
