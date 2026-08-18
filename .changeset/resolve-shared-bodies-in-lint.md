---
'speccy-core': patch
'speccy-cli': patch
---

Lint request bodies and responses after resolving `$ref`s, so operations that reuse `#/components/requestBodies` and `#/components/responses` no longer report false `request-media-type`, `response-description`, `success-response-schema`, and `structured-error-response` findings. Inline schemas inside those shared components are inspected once at their component path instead of once per operation. `timestamp-format` no longer flags strings whose `pattern` only allows digits, such as epoch-millisecond timestamps. `error-correlation-id` accepts a request or trace identifier carried in a response header such as `X-Request-Id` or `request-ref`, not only in the body.
