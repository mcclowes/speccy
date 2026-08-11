# OpenAPI 3.1.1 conformance

Speccy supports OpenAPI 3.1.1 descriptions for parsing, reference resolution,
documentation rendering, request samples and execution, and document download.
Downloads serve the raw parsed document when it is available and fall back to
the processed model document otherwise.

This is a renderer conformance claim. It means Speccy accepts and preserves the
complete OpenAPI 3.1.1 document vocabulary, presents every standard object and
field that has useful documentation meaning, resolves local and external
references, and applies OpenAPI serialization rules when it builds a request.

It does not mean Speccy is a JSON Schema validator, a code generator, an OAuth
client, a mutual-TLS certificate manager, or a callback and webhook runtime.
Those behaviors are outside a documentation renderer's boundary. Unknown JSON
Schema vocabularies and specification extensions are preserved even when Speccy
cannot assign them custom presentation semantics. The one deliberate exception
is Speccy's own `x-internal` marker: nodes marked internal are removed from the
rendered reference (the download is not yet filtered, see
[#34](https://github.com/mcclowes/speccy/issues/34)).

## Conformance matrix

| OpenAPI 3.1.1 area                                                                                                                | Status    | Automated evidence                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root document, `info`, contact, license, terms, tags, and external documentation                                                  | Supported | `OpenApi311.test.tsx` metadata tests                                                                                                                                                                                                       |
| Paths, operations, reusable Path Items, callbacks, and webhooks                                                                   | Supported | `OpenApi311.test.tsx`, `Speccy.test.tsx`                                                                                                                                                                                                   |
| Root, path, and operation servers, including variable defaults and enums                                                          | Supported | `OpenApi311.test.tsx` metadata and serialization tests                                                                                                                                                                                     |
| Parameters in path, query, header, and cookie locations                                                                           | Supported | `parameterSerialization.test.ts`, `OpenApi311.test.tsx`                                                                                                                                                                                    |
| Parameter `style`, `explode`, `allowReserved`, `allowEmptyValue`, `content`, examples, and defaults                               | Supported | `parameterSerialization.test.ts`, `OpenApi311.test.tsx`; `allowReserved` untested, tracked in [#35](https://github.com/mcclowes/speccy/issues/35)                                                                                          |
| Request bodies and every declared media type                                                                                      | Supported | `OpenApi311.test.tsx`, `Speccy.test.tsx`                                                                                                                                                                                                   |
| URL-encoded and multipart encoding objects, including part headers and content types                                              | Supported | `requestBodySerialization.test.ts`                                                                                                                                                                                                         |
| Responses, headers, examples, links, runtime expressions, and link servers                                                        | Supported | `OpenApi311.test.tsx`, `Speccy.test.tsx`                                                                                                                                                                                                   |
| Components: schemas, responses, parameters, examples, request bodies, headers, security schemes, links, callbacks, and Path Items | Supported | `OpenApi311.test.tsx` and `Speccy.test.tsx` render schemas, Path Items, security schemes, and links; the remaining sections share the same rendering path but are untested, tracked in [#35](https://github.com/mcclowes/speccy/issues/35) |
| API key, HTTP, OAuth 2, and mutual-TLS security descriptions                                                                      | Supported | `OpenApi311.test.tsx`, `SecurityScheme.test.tsx`, `Speccy.test.tsx`                                                                                                                                                                        |
| OpenID Connect security descriptions                                                                                              | Supported | None yet; rendering implemented, test gap tracked in [#33](https://github.com/mcclowes/speccy/issues/33)                                                                                                                                   |
| Security requirement alternatives and combined requirements                                                                       | Supported | `SecurityScheme.test.tsx`, `Speccy.test.tsx`                                                                                                                                                                                               |
| Local references, reference siblings, JSON Pointers, anchors, and dynamic anchors                                                 | Supported | `externalRefs.test.ts`, `model.test.ts`; dynamic anchors untested, tracked in [#35](https://github.com/mcclowes/speccy/issues/35)                                                                                                          |
| Relative and absolute multi-document references with nested base URIs                                                             | Supported | `externalRefs.test.ts`, `fragmentedSpec.test.ts`                                                                                                                                                                                           |
| JSON Schema 2020-12 core identifiers and annotations                                                                              | Supported | `OpenApi311.test.tsx` JSON Schema tests                                                                                                                                                                                                    |
| JSON Schema validation keywords for strings, numbers, arrays, and objects                                                         | Supported | `OpenApi311.test.tsx`, `SchemaView.test.tsx`                                                                                                                                                                                               |
| JSON Schema applicators, conditionals, dependent schemas, and unevaluated values                                                  | Supported | `OpenApi311.test.tsx` applicator test                                                                                                                                                                                                      |
| Recursive `true` and `false` schemas in nested properties and array items                                                         | Supported | `SchemaView.test.tsx`, `diffSpecs.test.ts`                                                                                                                                                                                                 |
| OpenAPI XML metadata, discriminator mappings, read/write visibility, deprecation, and examples                                    | Supported | `OpenApi311.test.tsx`, `SchemaView.test.tsx`, `model.test.ts`                                                                                                                                                                              |
| Specification extensions and unknown JSON Schema vocabulary keywords                                                              | Preserved | No dedicated round-trip test; `model.test.ts` covers Speccy's own extensions and `x-internal` removal                                                                                                                                      |

## Release gate

The matrix is enforced by the normal repository checks. Before changing this
claim or releasing a regression-sensitive change, run:

```sh
npm run check
```

The focused conformance suites are:

```sh
npm test -w speccy-core
npm test -w speccy-renderer -- --run src/OpenApi311.test.tsx src/SchemaView.test.tsx src/parameterSerialization.test.ts src/requestBodySerialization.test.ts
```

Any newly discovered OpenAPI 3.1.1 gap must first receive a failing regression
test, then an implementation fix. Keep this matrix aligned with that test.
