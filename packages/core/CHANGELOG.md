# speccy-core

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
