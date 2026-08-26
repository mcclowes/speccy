---
title: OpenAPI support
description: OpenAPI versions, objects, and JSON Schema features covered by Speccy.
---

# OpenAPI support

Speccy’s renderer is tested against OpenAPI 3.0.3 and 3.1.1 documents. Other patch releases within OpenAPI 3.0 and 3.1 use the same rendering paths, but those two versions are the compatibility fixtures run in CI.

Speccy accepts YAML or JSON. Local references are resolved before rendering, and the Studio, React renderer, and Docusaurus integration share the same document model.

## Coverage

The compatibility fixtures exercise the following parts of an OpenAPI document through the public renderer:

| Area                                                                                             | OpenAPI 3.0        | OpenAPI 3.1 |
| ------------------------------------------------------------------------------------------------ | ------------------ | ----------- |
| Document metadata, servers, variables, tags, paths, and operations                               | Tested             | Tested      |
| Parameters, request bodies, responses, headers, examples, links, callbacks, and security schemes | Tested             | Tested      |
| Reusable path items and top-level webhooks                                                       | Not defined by 3.0 | Tested      |
| Local `$ref` pointers and reusable component references                                          | Tested             | Tested      |
| Schema composition, constraints, examples, formats, and discriminators                           | Tested             | Tested      |
| Boolean schemas and JSON Schema 2020-12 keywords                                                 | Not defined by 3.0 | Tested      |
| Request parameter and body serialization                                                         | Tested             | Tested      |

The suite renders overview, operation, component, and webhook routes from complete YAML fixtures. Smaller regression tests cover reference cycles, escaped JSON pointers, parameter styles, request media types, Markdown, security alternatives, and malformed input.

## Rendering and validation

Rendering support doesn’t mean that Speccy validates every OpenAPI constraint. The renderer is deliberately tolerant of incomplete documents, so authors can still inspect a draft. Use **API health** or `speccy lint` to find structural and authoring problems.

Fields with a direct documentation value are shown in the reference. Some fields only control tooling or runtime behavior and aren’t printed as prose. For example, request serialization settings affect generated requests, while JSON Schema identifiers and dialect declarations guide schema processing.

## References

Local references beginning with `#/` are resolved synchronously. Multi-file descriptions must be bundled before rendering, or loaded through a Speccy integration that resolves external files. Circular schema references remain links at the recursion point, which prevents an infinite render while preserving the relationship.

See [Test API requests](./test-api-requests.md) for request serialization and authentication behavior, and [Review API health](./api-health.md) for validation and diagnostics.
