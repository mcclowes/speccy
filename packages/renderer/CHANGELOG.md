# speccy-renderer

## 0.10.4

### Patch Changes

- [`762a0cc`](https://github.com/mcclowes/speccy/commit/762a0cc118e35b218f4b176e9aea1fc4bdbb1e6b) Thanks [@mcclowes](https://github.com/mcclowes)! - Collapse query parameters and headers in operation previews by default, with per-section disclosure defaults.

- Updated dependencies []:
  - speccy-core@0.10.4

## 0.10.3

### Patch Changes

- [`8513236`](https://github.com/mcclowes/speccy/commit/8513236b3495905afd670701164a199760cf2fbc) Thanks [@mcclowes](https://github.com/mcclowes)! - Operation links, strips, cards, and previews now inherit the host page's theme by default, so they switch to dark mode alongside Docusaurus instead of staying light. Pass `theme` to pin a colour scheme.

- [`3838e7b`](https://github.com/mcclowes/speccy/commit/3838e7bce636b1c7dee1a1a3bf239883506e9b60) Thanks [@mcclowes](https://github.com/mcclowes)! - Render operation preview responses with the same sectioned, foldable treatment as requests, and clip long previews behind a single "Show full request/response" toggle that accounts for path, parameters, and headers as well as the body.

- Updated dependencies []:
  - speccy-core@0.10.3

## 0.10.2

### Patch Changes

- [`1e1daa6`](https://github.com/mcclowes/speccy/commit/1e1daa660aea5cfd3406bdfd5cc143384b636aa9) Thanks [@mcclowes](https://github.com/mcclowes)! - Render JSON and code lines on separate rows in operation previews and live responses, instead of running them together on one line.

- Updated dependencies []:
  - speccy-core@0.10.2

## 0.10.1

### Patch Changes

- [#51](https://github.com/mcclowes/speccy/pull/51) [`59e8d04`](https://github.com/mcclowes/speccy/commit/59e8d04cf775477f4a60d4ea752320b4ed1ca5d9) Thanks [@mcclowes](https://github.com/mcclowes)! - Let the operation documentation components resolve themselves from an OpenAPI document. `href` is now optional on `OperationLink`, `EndpointStrip`, `OperationCard`, and `OperationPreview`: pass `spec` (and `basePath`) to one component, or wrap pages in the new `OperationReferenceProvider`, and each component derives its link from the operation's `operationId` while `OperationPreview` derives its examples. Paths accept OpenAPI `#variant` fragments, `operationId` looks operations and webhooks up directly while keeping a custom display path, `api` selects one of several named sources, and `requestExample`/`responseExample` accept plain objects.

- Updated dependencies []:
  - speccy-core@0.10.1

## 0.10.0

### Minor Changes

- [`702ace8`](https://github.com/mcclowes/speccy/commit/702ace8c74fe547e358bfabf60ad723154621064) Thanks [@mcclowes](https://github.com/mcclowes)! - Add a `wrapSidebarLabels` option that wraps long sidebar endpoint labels onto a second line instead of truncating them on one, so summaries that share a long prefix stay distinguishable.

### Patch Changes

- Updated dependencies [[`25e7ae0`](https://github.com/mcclowes/speccy/commit/25e7ae0294f75e0508eaa474a5c9d1166d39d30d)]:
  - speccy-core@0.10.0

## 0.9.0

### Minor Changes

- [`875ff11`](https://github.com/mcclowes/speccy/commit/875ff116f1e3f2757b37b3afd16e0d6a2d2ca22e) Thanks [@mcclowes](https://github.com/mcclowes)! - Let operation previews derive layered path, query, header, body, and response examples from an OpenAPI document, with structured request overrides.

### Patch Changes

- [`7f8d7d7`](https://github.com/mcclowes/speccy/commit/7f8d7d7f046d913cc6ad7b899223adeec2b71d0a) Thanks [@mcclowes](https://github.com/mcclowes)! - Group API overview metadata into a compact, labeled panel.

- [`a532322`](https://github.com/mcclowes/speccy/commit/a5323224a460d744109154416604dcf4ad725437) Thanks [@mcclowes](https://github.com/mcclowes)! - Show explicit progress while API health checks index a document.

- Updated dependencies [[`498f690`](https://github.com/mcclowes/speccy/commit/498f690824da9e6ed50e231db52bdbb2d747c2a7)]:
  - speccy-core@0.9.0

## 0.8.0

### Minor Changes

- [`1326b39`](https://github.com/mcclowes/speccy/commit/1326b3906f6d1a0dd90db47212d4428987ac445c) Thanks [@mcclowes](https://github.com/mcclowes)! - Show callback operations and runtime expressions in operation workflow context.

- [`7c5d767`](https://github.com/mcclowes/speccy/commit/7c5d767f310283433a6e18d42b1f96407bf1810f) Thanks [@mcclowes](https://github.com/mcclowes)! - Render operation lifecycle badges from `x-speccy-lifecycle` metadata.

- [`fae971a`](https://github.com/mcclowes/speccy/commit/fae971a23e1d5e6328c90ae8165207d9e9282d8a) Thanks [@mcclowes](https://github.com/mcclowes)! - Connect operations and emitted webhooks through bidirectional workflow links.

- [`942176b`](https://github.com/mcclowes/speccy/commit/942176b020f64d882481371a0cd7f07c923e5498) Thanks [@mcclowes](https://github.com/mcclowes)! - Add portable operation links, strips, cards, and request/response previews for React and Docusaurus documentation.

### Patch Changes

- [`ce7ced8`](https://github.com/mcclowes/speccy/commit/ce7ced8109ec9ee4699d96080d03cb9082ca9a90) Thanks [@mcclowes](https://github.com/mcclowes)! - Present operation workflows in a card that starts collapsed.

- [`a5a0811`](https://github.com/mcclowes/speccy/commit/a5a08110f08ef4c4158daccff501b44ab506e4b5) Thanks [@mcclowes](https://github.com/mcclowes)! - Cancel copied-state updates when a code block unmounts.

- Updated dependencies [[`7c5d767`](https://github.com/mcclowes/speccy/commit/7c5d767f310283433a6e18d42b1f96407bf1810f), [`fae971a`](https://github.com/mcclowes/speccy/commit/fae971a23e1d5e6328c90ae8165207d9e9282d8a), [`f7aec02`](https://github.com/mcclowes/speccy/commit/f7aec02344e8f627472b0b96bf9c1b8fc0c29398)]:
  - speccy-core@0.8.0

## 0.7.2

### Patch Changes

- [`d3a3fee`](https://github.com/mcclowes/speccy/commit/d3a3fee7386baab137b238254e21f9b9755a6e9f) Thanks [@mcclowes](https://github.com/mcclowes)! - Improve API reference scanning and interaction by labeling deprecated operations, presenting request media types as body alternatives, and making schema field details toggle on row click.

- Updated dependencies []:
  - speccy-core@0.7.2

## 0.7.1

### Patch Changes

- [`6a26613`](https://github.com/mcclowes/speccy/commit/6a266138309bd404e10558857a761da241f7f539) Thanks [@mcclowes](https://github.com/mcclowes)! - Add spacing between floating API health findings.

- Updated dependencies []:
  - speccy-core@0.7.1

## 0.7.0

### Patch Changes

- Updated dependencies []:
  - speccy-core@0.7.0

## 0.6.0

### Minor Changes

- [`5ea5ccf`](https://github.com/mcclowes/speccy/commit/5ea5ccf24b34cf6b907f3feff80bb5f35af72696) Thanks [@mcclowes](https://github.com/mcclowes)! - Add public OpenAPI description links, stable generated description URLs, and configurable Run in Postman actions.

- [`2345c84`](https://github.com/mcclowes/speccy/commit/2345c8497f1f099f2ba6a234a7b165f2835da73b) Thanks [@mcclowes](https://github.com/mcclowes)! - Add a `showApiVersion` renderer setting for hiding the API version in the overview heading.

### Patch Changes

- Updated dependencies []:
  - speccy-core@0.6.0

## 0.5.0

### Minor Changes

- [`f0de56b`](https://github.com/mcclowes/speccy/commit/f0de56b5c4089e958ea509e9c1fe7da5c1520bbb) Thanks [@mcclowes](https://github.com/mcclowes)! - Add a `tryIt` option for publishing static API references without the interactive request builder or live API calls.

### Patch Changes

- [`b6134de`](https://github.com/mcclowes/speccy/commit/b6134def3e895363e0e1c5482d189c079eba838e) Thanks [@mcclowes](https://github.com/mcclowes)! - Align request body headings with their media type labels.

- [`f911d7f`](https://github.com/mcclowes/speccy/commit/f911d7f4dafd3504aa6c490e5fa0474a0a4fb46f) Thanks [@mcclowes](https://github.com/mcclowes)! - Align sidebar subgroup headings with their operation labels.

- [`11d51f4`](https://github.com/mcclowes/speccy/commit/11d51f4814b82b3c2b039264a85662e2aab3b0ad) Thanks [@mcclowes](https://github.com/mcclowes)! - Match request example section header backgrounds to their code blocks.

- [`468a9ce`](https://github.com/mcclowes/speccy/commit/468a9ce36159968501fbea7142f96380854f137d) Thanks [@mcclowes](https://github.com/mcclowes)! - Use raised surfaces for request example and code language selectors.

- [`d08b775`](https://github.com/mcclowes/speccy/commit/d08b77515ddb94176206081fadf4e0472ce190ad) Thanks [@mcclowes](https://github.com/mcclowes)! - Refine the optional parameter picker size and background.

- Updated dependencies []:
  - speccy-core@0.5.0

## 0.4.4

### Patch Changes

- [`77b0921`](https://github.com/mcclowes/speccy/commit/77b09210ccdfd4fbb4146f93558970228ed2ef60) Thanks [@mcclowes](https://github.com/mcclowes)! - Improve style isolation, responsive layouts, code samples, diagnostics, schema exploration, and disclosure animations across rendered API references.

- Updated dependencies []:
  - speccy-core@0.4.4

## 0.4.3

### Patch Changes

- [`3c7381d`](https://github.com/mcclowes/speccy/commit/3c7381d22bb52091afc48240af23380f375eed82) Thanks [@mcclowes](https://github.com/mcclowes)! - Keep inherited themes controlled by the host, hide Speccy's duplicate theme control, improve inherited color contrast, and enlarge desktop sidebar labels.

- Updated dependencies []:
  - speccy-core@0.4.3

## 0.4.2

### Patch Changes

- 8c0eba6: Allow server bundlers without the `import` condition to resolve the ESM entry points.
- 96a68fb: Let Docusaurus API references inherit the site's color mode, typography, and base font size.
- d6a8b35: Version all Speccy packages together so consumers can use one version across the package suite.
- Updated dependencies [8c0eba6]
- Updated dependencies [d6a8b35]
  - speccy-core@0.4.2

## 0.4.1

### Patch Changes

- [`efdc6c3`](https://github.com/mcclowes/speccy/commit/efdc6c309775b2d8ba7947291a0ee341114fe66b) Thanks [@mcclowes](https://github.com/mcclowes)! - Ship optional parameter controls with their component styles.

## 0.4.0

### Minor Changes

- [`8f79a0e`](https://github.com/mcclowes/speccy/commit/8f79a0e6adda3c24953c4daacf1ee75483cffc29) Thanks [@mcclowes](https://github.com/mcclowes)! - Redesign operation details with schema explorers for parameters and response headers, focused request examples, collapsible code blocks, and clearer response content.

## 0.3.1

### Patch Changes

- [`1ca7e6a`](https://github.com/mcclowes/speccy/commit/1ca7e6a727415d2dd85c9749f2858d6adc82e477) Thanks [@mcclowes](https://github.com/mcclowes)! - Preserve referenced internal response schemas when they are exposed through public operations, and show details for primitive response schemas.

- Updated dependencies [[`1ca7e6a`](https://github.com/mcclowes/speccy/commit/1ca7e6a727415d2dd85c9749f2858d6adc82e477)]:
  - speccy-core@0.3.1
