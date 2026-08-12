# Speccy for Docusaurus

Speccy adds a clean OpenAPI reference to a Docusaurus 3 site. It can build a full reference route from a local file or a remote URL, and the same renderer can be embedded in MDX with an inline document. The package is published as [`docusaurus-plugin-speccy`](https://www.npmjs.com/package/docusaurus-plugin-speccy).

## Install

```sh
npm install docusaurus-plugin-speccy
```

Add the plugin to `docusaurus.config.ts`:

```ts
export default {
  plugins: [
    [
      'docusaurus-plugin-speccy',
      {
        route: '/api',
        spec: './static/openapi.yaml',
        renderer: {
          accentColor: '#6d5dfc',
        },
      },
    ],
  ],
};
```

The reference is now available at `/api`. Use `specUrl` in place of `spec` to fetch a remote document at build time; the build environment must be able to reach that URL. The plugin also publishes the rendered description at `/api/openapi.yaml`, adjusted for the site's `baseUrl`, and links to it from the overview.

Register the plugin more than once to publish several references. Every instance needs a unique Docusaurus `id`:

```ts
plugins: [
  [
    'docusaurus-plugin-speccy',
    { id: 'payments', route: '/api', spec: './static/payments.yaml' },
  ],
  [
    'docusaurus-plugin-speccy',
    {
      id: 'backoffice',
      route: '/api/backoffice',
      spec: './static/backoffice.yaml',
    },
  ],
];
```

By default, the plugin builds a static page for the overview, each endpoint, each tag, and each component section. These pages share one copy of the OpenAPI document. For very large references where build speed matters more than server-rendered deep links, use one client-routed page instead:

```ts
{
  routeGeneration: 'client',
}
```

Generated pages use the Docusaurus layout, including its navbar and route-specific title and description metadata. The footer is hidden by default so the reference can use the available height. Show it with `layout: { noFooter: false }`, or set `layout: false` to render the reference without the Docusaurus page shell.

Add a public Postman collection through the renderer settings:

```ts
renderer: {
  postmanCollectionUrl: 'https://www.postman.com/example/collection',
}
```

Set `renderer.openApiUrl` only when the description is hosted somewhere else. This overrides the generated link without changing the file emitted by the plugin.

To embed a reference in MDX:

```mdx
import { OpenAPI } from 'docusaurus-plugin-speccy/client';
import spec from '@site/static/openapi.json';

<OpenAPI spec={spec} />
```

Embedded references hide their internal sidebar by default. Set `showSidebar` to add it. Registering the plugin in `plugins` also loads the renderer stylesheet; when you embed the component without registering the plugin, import `docusaurus-plugin-speccy/styles.css` once yourself.

Set `renderer.tryIt` to `false` on a generated route, or pass `tryIt={false}` to an embedded `OpenAPI` component, to hide the request builder and prevent visitors from sending requests.

### Link guides to operations

The client entry point also exports four MDX-friendly treatments for linking guide content to an operation:

```mdx
import {
  EndpointStrip,
  OperationCard,
  OperationLink,
  OperationPreview,
} from 'docusaurus-plugin-speccy/client';

Call <OperationLink method="post" path="/corporates" href="/api/create-corporate" /> to create the identity.

<OperationCard
  method="post"
  path="/corporates"
  summary="Create a corporate identity"
  description="Creates the identity and its root user."
  href="/api/create-corporate"
/>
```

Use `OperationLink` inside prose, `EndpointStrip` for a full-width callout, `OperationCard` in operation collections, and `OperationPreview` when the guide should include request and response examples. They use ordinary links, so provide the generated operation URL for the relevant reference.

Speccy follows Docusaurus's selected color mode, typography, and base font size by default. For independent theme controls, set `renderer.theme` to a value other than `inherit`, and add `renderer.showThemeToggle: true` to give visitors a toggle; the toggle only appears when both are set.

Generated references show Speccy's API health guidance during local Docusaurus development and hide it in production builds. Override this with `renderer.showDeveloperHints` when you need explicit control; note the plugin only runs Spectral during development builds, so forcing hints on in production shows Speccy's own guidance without Spectral findings. You can also pass `previousSpec` and `spectralDiagnostics` through the renderer options.
