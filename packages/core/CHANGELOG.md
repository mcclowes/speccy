# speccy-core

## 0.13.2

## 0.13.1

## 0.13.0

### Minor Changes

- [#62](https://github.com/mcclowes/speccy/pull/62) [`eb610fc`](https://github.com/mcclowes/speccy/commit/eb610fc94281a40352b093746f2084c9368da817) Thanks [@mcclowes](https://github.com/mcclowes)! - Fix a set of OpenAPI constructs that rendered incorrectly or not at all.

  Operation parameters now replace the path-level parameters they repeat, as OpenAPI specifies. They previously rendered twice and were serialized twice into the generated request. An operation listed under several tags now appears under each of them instead of only the first.

  Request and response bodies route through the schema explorer, which understood only declared properties and `allOf`. A `oneOf` body rendered as a single object built from a generated example, so every branch but the first disappeared, and `additionalProperties` and `patternProperties` were dropped. The explorer now renders root alternatives, pattern properties, additional properties, and a closed-object note, and schemas using keywords it cannot express fall back to the recursive schema view rather than losing them.

  `discriminator` is rendered for the first time: both schema surfaces name the property that selects the shape and label each alternative with the mapped value that chooses it.

  A schema with no explicit `type` was labelled `object` and `const` was ignored entirely, so `{ const: 'card' }` displayed as an object whose example was the string `"string"`. Types now come from the const literal, the structural keywords, or a shared composed type, and read `any` only when nothing constrains the value.

  Parameters declared with `content` rather than `schema` are described instead of showing an empty object — the Swagger 2 normalizer no longer fabricates a stand-in schema for OpenAPI 3 parameters. Parameter deprecation, serialization style, and named examples now render, as do a reusable header's required flag, deprecation, and examples, a reusable example's summary, and a Path Item's summary and description. An example's `externalValue` is presented as a link rather than as the payload, and field-level XML and external documentation are reachable again.

## 0.12.0

## 0.11.0

### Minor Changes

- [`88925b9`](https://github.com/mcclowes/speccy/commit/88925b96a3f8b27d11341bbab880a3a155d3d3fd) Thanks [@mcclowes](https://github.com/mcclowes)! - Add `speccy diff --material` to exclude descriptions and extension metadata from contract comparisons.

## 0.10.4

## 0.10.3

## 0.10.2

## 0.10.1

## 0.10.0

### Patch Changes

- [`25e7ae0`](https://github.com/mcclowes/speccy/commit/25e7ae0294f75e0508eaa474a5c9d1166d39d30d) Thanks [@mcclowes](https://github.com/mcclowes)! - Lint request bodies and responses after resolving `$ref`s, so operations that reuse `#/components/requestBodies` and `#/components/responses` no longer report false `request-media-type`, `response-description`, `success-response-schema`, and `structured-error-response` findings. Inline schemas inside those shared components are inspected once at their component path instead of once per operation. `timestamp-format` no longer flags strings whose `pattern` only allows digits, such as epoch-millisecond timestamps. `error-correlation-id` accepts a request or trace identifier carried in a response header such as `X-Request-Id` or `request-ref`, not only in the body.

## 0.9.0

### Patch Changes

- [`498f690`](https://github.com/mcclowes/speccy/commit/498f690824da9e6ed50e231db52bdbb2d747c2a7) Thanks [@mcclowes](https://github.com/mcclowes)! - Keep entry-document local references compact while resolving external OpenAPI documents.

## 0.8.0

### Minor Changes

- [`7c5d767`](https://github.com/mcclowes/speccy/commit/7c5d767f310283433a6e18d42b1f96407bf1810f) Thanks [@mcclowes](https://github.com/mcclowes)! - Render operation lifecycle badges from `x-speccy-lifecycle` metadata.

- [`fae971a`](https://github.com/mcclowes/speccy/commit/fae971a23e1d5e6328c90ae8165207d9e9282d8a) Thanks [@mcclowes](https://github.com/mcclowes)! - Connect operations and emitted webhooks through bidirectional workflow links.

- [`f7aec02`](https://github.com/mcclowes/speccy/commit/f7aec02344e8f627472b0b96bf9c1b8fc0c29398) Thanks [@mcclowes](https://github.com/mcclowes)! - Suggest dated lifecycle metadata for new operations and support presets, severity overrides, rule options, and scoped ignores through `.speccyrc`.

## 0.7.2

## 0.7.1

## 0.7.0

## 0.6.0

## 0.5.0

## 0.4.4

## 0.4.3

## 0.4.2

### Patch Changes

- 8c0eba6: Allow server bundlers without the `import` condition to resolve the ESM entry points.
- d6a8b35: Version all Speccy packages together so consumers can use one version across the package suite.

## 0.3.1

### Patch Changes

- [`1ca7e6a`](https://github.com/mcclowes/speccy/commit/1ca7e6a727415d2dd85c9749f2858d6adc82e477) Thanks [@mcclowes](https://github.com/mcclowes)! - Preserve referenced internal response schemas when they are exposed through public operations, and show details for primitive response schemas.
