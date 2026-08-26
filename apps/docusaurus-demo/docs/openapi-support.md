---
title: OpenAPI support
description: OpenAPI versions, objects, and JSON Schema features covered by Speccy.
---

# OpenAPI support

Speccy’s renderer is tested against OpenAPI 3.0.3 and 3.1.1 documents. Other patch releases within OpenAPI 3.0 and 3.1 use the same rendering paths, but those two versions are the compatibility fixtures run in CI.

Speccy accepts YAML or JSON. Local references are resolved before rendering, and the Studio, React renderer, and Docusaurus integration share the same document model.

## Coverage

Coverage has three levels:

- **Fixture** means a complete versioned YAML document exercises the behavior through the public renderer.
- **Focused** means smaller tests cover the behavior or its combinations directly.
- **Partial** means representative cases are covered, but the specification allows more combinations than the suite enumerates.

| Area                                                                                             | OpenAPI 3.0        | OpenAPI 3.1       |
| ------------------------------------------------------------------------------------------------ | ------------------ | ----------------- |
| Document metadata, servers, variables, tags, paths, and operations                               | Fixture + focused  | Fixture + focused |
| GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD, and TRACE routes                                   | Fixture            | Shared model      |
| Parameters, request bodies, responses, headers, examples, links, callbacks, and security schemes | Fixture + focused  | Fixture + focused |
| API key, HTTP, OAuth 2, OpenID Connect, and mutual TLS schemes                                   | Fixture + focused  | Fixture + focused |
| Reusable path items and top-level webhooks                                                       | Not defined by 3.0 | Fixture + focused |
| Local `$ref`, escaped JSON Pointer tokens, siblings, and circular schemas                        | Focused            | Focused           |
| Multi-file and URL references                                                                    | Focused in core    | Focused in core   |
| Schema composition, constraints, examples, formats, and discriminators                           | Focused            | Focused           |
| Boolean schemas and JSON Schema 2020-12 keywords                                                 | Not defined by 3.0 | Fixture + focused |
| Parameter styles and explode combinations                                                        | Focused, partial   | Focused, partial  |
| JSON, URL-encoded, multipart, and alternate response media types                                 | Focused, partial   | Focused, partial  |
| Malformed YAML and missing version metadata                                                      | Focused            | Focused           |

The suite renders overview, operation, component, and webhook routes from the versioned fixtures. It also checks accessible names for the rendered controls and fields. This is broad behavioral coverage, not a claim that every legal combination in the OpenAPI schemas is enumerated.

## Rendering and validation

Rendering support doesn’t mean that Speccy validates every OpenAPI constraint. The renderer is deliberately tolerant of incomplete documents, so authors can still inspect a draft. Use **API health** or `speccy lint` to find structural and authoring problems.

Fields with a direct documentation value are shown in the reference. Some fields only control tooling or runtime behavior and aren’t printed as prose. For example, request serialization settings affect generated requests, while JSON Schema identifiers and dialect declarations guide schema processing.

## References

Local references beginning with `#/` are resolved synchronously. Multi-file descriptions must be bundled before rendering, or loaded through a Speccy integration that resolves external files. Circular schema references remain links at the recursion point, which prevents an infinite render while preserving the relationship.

See [Test API requests](./test-api-requests.md) for request serialization and authentication behavior, and [Review API health](./api-health.md) for validation and diagnostics.
