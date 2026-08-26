# docusaurus-plugin-speccy

## 0.13.0

### Minor Changes

- [#62](https://github.com/mcclowes/speccy/pull/62) [`54e9a75`](https://github.com/mcclowes/speccy/commit/54e9a75688cb3f46ecbd5ab91f3599be2433ce32) Thanks [@mcclowes](https://github.com/mcclowes)! - Add a Webhooks reference page listing every webhook the API delivers.

  Webhooks still appear under their tag in the sidebar, but the Reference group now also links to `/reference/webhooks`, a single list of every webhook in the spec. The entry and its generated route appear only when the document declares webhooks.

### Patch Changes

- [#62](https://github.com/mcclowes/speccy/pull/62) [`ac83fee`](https://github.com/mcclowes/speccy/commit/ac83fee12fcf9b6575d88fa669980f59fa789859) Thanks [@mcclowes](https://github.com/mcclowes)! - Serve the published OpenAPI description under `docusaurus start`. The file was only emitted from `postBuild`, so the overview's link to it 404ed for the whole time an author worked locally. The plugin now writes the description into its generated files directory and mounts that directory on the dev server at the same URL.

  The overview card also shows the description's URL instead of a second "Open OpenAPI description" label, and opens it in a new tab rather than navigating the reader out of the docs.

- Updated dependencies [[`ac83fee`](https://github.com/mcclowes/speccy/commit/ac83fee12fcf9b6575d88fa669980f59fa789859), [`54e9a75`](https://github.com/mcclowes/speccy/commit/54e9a75688cb3f46ecbd5ab91f3599be2433ce32), [`8a798d1`](https://github.com/mcclowes/speccy/commit/8a798d1d0dc9c98d75ff8443d5069ea8d33ed927), [`eb610fc`](https://github.com/mcclowes/speccy/commit/eb610fc94281a40352b093746f2084c9368da817), [`1e75c06`](https://github.com/mcclowes/speccy/commit/1e75c06c9d473c264140c2404ed89f70c5507832)]:
  - speccy-renderer@0.13.0
  - speccy-spectral@0.13.0

## 0.12.0

### Minor Changes

- [`008b7be`](https://github.com/mcclowes/speccy/commit/008b7bef867a7b8d7ca8f223ddf4a231e1ad23f2) Thanks [@mcclowes](https://github.com/mcclowes)! - Generate compact operation catalogs for Docusaurus and expose an automatic provider that resolves embedded operation links and previews without bundling complete OpenAPI documents into every documentation page.

### Patch Changes

- Updated dependencies [[`68ce3b5`](https://github.com/mcclowes/speccy/commit/68ce3b595a4c5b24114b9cd9b220585d09e30dba), [`008b7be`](https://github.com/mcclowes/speccy/commit/008b7bef867a7b8d7ca8f223ddf4a231e1ad23f2), [`5931c56`](https://github.com/mcclowes/speccy/commit/5931c5647d3c8d9a45698de896f42a9099142ecf)]:
  - speccy-renderer@0.12.0
  - speccy-spectral@0.12.0

## 0.11.0

### Patch Changes

- [`966be33`](https://github.com/mcclowes/speccy/commit/966be332f2286985d81c1f886cebaed89b0efafb) Thanks [@mcclowes](https://github.com/mcclowes)! - Publish JSON OpenAPI sources as `openapi.json` and point the overview download link at the matching filename.

- Updated dependencies []:
  - speccy-renderer@0.11.0
  - speccy-spectral@0.11.0

## 0.10.4

### Patch Changes

- Updated dependencies [[`762a0cc`](https://github.com/mcclowes/speccy/commit/762a0cc118e35b218f4b176e9aea1fc4bdbb1e6b)]:
  - speccy-renderer@0.10.4
  - speccy-spectral@0.10.4

## 0.10.3

### Patch Changes

- Updated dependencies [[`8513236`](https://github.com/mcclowes/speccy/commit/8513236b3495905afd670701164a199760cf2fbc), [`3838e7b`](https://github.com/mcclowes/speccy/commit/3838e7bce636b1c7dee1a1a3bf239883506e9b60)]:
  - speccy-renderer@0.10.3
  - speccy-spectral@0.10.3

## 0.10.2

### Patch Changes

- Updated dependencies [[`1e1daa6`](https://github.com/mcclowes/speccy/commit/1e1daa660aea5cfd3406bdfd5cc143384b636aa9)]:
  - speccy-renderer@0.10.2
  - speccy-spectral@0.10.2

## 0.10.1

### Patch Changes

- [#51](https://github.com/mcclowes/speccy/pull/51) [`59e8d04`](https://github.com/mcclowes/speccy/commit/59e8d04cf775477f4a60d4ea752320b4ed1ca5d9) Thanks [@mcclowes](https://github.com/mcclowes)! - Let the operation documentation components resolve themselves from an OpenAPI document. `href` is now optional on `OperationLink`, `EndpointStrip`, `OperationCard`, and `OperationPreview`: pass `spec` (and `basePath`) to one component, or wrap pages in the new `OperationReferenceProvider`, and each component derives its link from the operation's `operationId` while `OperationPreview` derives its examples. Paths accept OpenAPI `#variant` fragments, `operationId` looks operations and webhooks up directly while keeping a custom display path, `api` selects one of several named sources, and `requestExample`/`responseExample` accept plain objects.

- Updated dependencies [[`59e8d04`](https://github.com/mcclowes/speccy/commit/59e8d04cf775477f4a60d4ea752320b4ed1ca5d9)]:
  - speccy-renderer@0.10.1
  - speccy-spectral@0.10.1

## 0.10.0

### Patch Changes

- Updated dependencies [[`702ace8`](https://github.com/mcclowes/speccy/commit/702ace8c74fe547e358bfabf60ad723154621064)]:
  - speccy-renderer@0.10.0
  - speccy-spectral@0.10.0

## 0.9.0

### Minor Changes

- [`875ff11`](https://github.com/mcclowes/speccy/commit/875ff116f1e3f2757b37b3afd16e0d6a2d2ca22e) Thanks [@mcclowes](https://github.com/mcclowes)! - Let operation previews derive layered path, query, header, body, and response examples from an OpenAPI document, with structured request overrides.

### Patch Changes

- Updated dependencies [[`875ff11`](https://github.com/mcclowes/speccy/commit/875ff116f1e3f2757b37b3afd16e0d6a2d2ca22e), [`4cdd763`](https://github.com/mcclowes/speccy/commit/4cdd763fa0e390a110eeab8ff191481b7a9b0052), [`7f8d7d7`](https://github.com/mcclowes/speccy/commit/7f8d7d7f046d913cc6ad7b899223adeec2b71d0a), [`a532322`](https://github.com/mcclowes/speccy/commit/a5323224a460d744109154416604dcf4ad725437)]:
  - speccy-renderer@0.9.0
  - speccy-spectral@0.9.0

## 0.8.0

### Minor Changes

- [`7c5d767`](https://github.com/mcclowes/speccy/commit/7c5d767f310283433a6e18d42b1f96407bf1810f) Thanks [@mcclowes](https://github.com/mcclowes)! - Render operation lifecycle badges from `x-speccy-lifecycle` metadata.

- [`942176b`](https://github.com/mcclowes/speccy/commit/942176b020f64d882481371a0cd7f07c923e5498) Thanks [@mcclowes](https://github.com/mcclowes)! - Add portable operation links, strips, cards, and request/response previews for React and Docusaurus documentation.

### Patch Changes

- Updated dependencies [[`1326b39`](https://github.com/mcclowes/speccy/commit/1326b3906f6d1a0dd90db47212d4428987ac445c), [`7c5d767`](https://github.com/mcclowes/speccy/commit/7c5d767f310283433a6e18d42b1f96407bf1810f), [`ce7ced8`](https://github.com/mcclowes/speccy/commit/ce7ced8109ec9ee4699d96080d03cb9082ca9a90), [`fae971a`](https://github.com/mcclowes/speccy/commit/fae971a23e1d5e6328c90ae8165207d9e9282d8a), [`a5a0811`](https://github.com/mcclowes/speccy/commit/a5a08110f08ef4c4158daccff501b44ab506e4b5), [`942176b`](https://github.com/mcclowes/speccy/commit/942176b020f64d882481371a0cd7f07c923e5498)]:
  - speccy-renderer@0.8.0
  - speccy-spectral@0.8.0

## 0.7.2

### Patch Changes

- Updated dependencies [[`d3a3fee`](https://github.com/mcclowes/speccy/commit/d3a3fee7386baab137b238254e21f9b9755a6e9f)]:
  - speccy-renderer@0.7.2
  - speccy-spectral@0.7.2

## 0.7.1

### Patch Changes

- Updated dependencies [[`6a26613`](https://github.com/mcclowes/speccy/commit/6a266138309bd404e10558857a761da241f7f539)]:
  - speccy-renderer@0.7.1
  - speccy-spectral@0.7.1

## 0.7.0

### Minor Changes

- [`cbab1d7`](https://github.com/mcclowes/speccy/commit/cbab1d76ada2e73f61798fce33060dce09bb648f) Thanks [@mcclowes](https://github.com/mcclowes)! - Wrap generated references in the Docusaurus layout, add route-specific metadata, and document multiple static reference instances.

### Patch Changes

- Updated dependencies []:
  - speccy-spectral@0.7.0
  - speccy-renderer@0.7.0

## 0.6.0

### Minor Changes

- [`5ea5ccf`](https://github.com/mcclowes/speccy/commit/5ea5ccf24b34cf6b907f3feff80bb5f35af72696) Thanks [@mcclowes](https://github.com/mcclowes)! - Add public OpenAPI description links, stable generated description URLs, and configurable Run in Postman actions.

- [`76b75b2`](https://github.com/mcclowes/speccy/commit/76b75b21df04af210452deab91cc3c8a5a5c46f6) Thanks [@mcclowes](https://github.com/mcclowes)! - Generate static reference routes by default, share one OpenAPI document between them, and add a client-routed fallback mode.

### Patch Changes

- Updated dependencies [[`5ea5ccf`](https://github.com/mcclowes/speccy/commit/5ea5ccf24b34cf6b907f3feff80bb5f35af72696), [`2345c84`](https://github.com/mcclowes/speccy/commit/2345c8497f1f099f2ba6a234a7b165f2835da73b)]:
  - speccy-renderer@0.6.0
  - speccy-spectral@0.6.0

## 0.5.0

### Minor Changes

- [`f0de56b`](https://github.com/mcclowes/speccy/commit/f0de56b5c4089e958ea509e9c1fe7da5c1520bbb) Thanks [@mcclowes](https://github.com/mcclowes)! - Add a `tryIt` option for publishing static API references without the interactive request builder or live API calls.

### Patch Changes

- Updated dependencies [[`b6134de`](https://github.com/mcclowes/speccy/commit/b6134def3e895363e0e1c5482d189c079eba838e), [`f911d7f`](https://github.com/mcclowes/speccy/commit/f911d7f4dafd3504aa6c490e5fa0474a0a4fb46f), [`11d51f4`](https://github.com/mcclowes/speccy/commit/11d51f4814b82b3c2b039264a85662e2aab3b0ad), [`468a9ce`](https://github.com/mcclowes/speccy/commit/468a9ce36159968501fbea7142f96380854f137d), [`f0de56b`](https://github.com/mcclowes/speccy/commit/f0de56b5c4089e958ea509e9c1fe7da5c1520bbb), [`d08b775`](https://github.com/mcclowes/speccy/commit/d08b77515ddb94176206081fadf4e0472ce190ad)]:
  - speccy-renderer@0.5.0
  - speccy-spectral@0.5.0

## 0.4.4

### Patch Changes

- Updated dependencies [[`77b0921`](https://github.com/mcclowes/speccy/commit/77b09210ccdfd4fbb4146f93558970228ed2ef60)]:
  - speccy-renderer@0.4.4
  - speccy-spectral@0.4.4

## 0.4.3

### Patch Changes

- Updated dependencies [[`3c7381d`](https://github.com/mcclowes/speccy/commit/3c7381d22bb52091afc48240af23380f375eed82)]:
  - speccy-renderer@0.4.3
  - speccy-spectral@0.4.3

## 0.4.2

### Patch Changes

- 96a68fb: Let Docusaurus API references inherit the site's color mode, typography, and base font size.
- d6a8b35: Version all Speccy packages together so consumers can use one version across the package suite.
- Updated dependencies [8c0eba6]
- Updated dependencies [96a68fb]
- Updated dependencies [d6a8b35]
  - speccy-renderer@0.4.2
  - speccy-spectral@0.4.2

## 0.3.1

### Patch Changes

- Updated dependencies [[`8f79a0e`](https://github.com/mcclowes/speccy/commit/8f79a0e6adda3c24953c4daacf1ee75483cffc29)]:
  - speccy-renderer@0.4.0
