---
'speccy-renderer': minor
'speccy-core': minor
---

Fix a set of OpenAPI constructs that rendered incorrectly or not at all.

Operation parameters now replace the path-level parameters they repeat, as OpenAPI specifies. They previously rendered twice and were serialized twice into the generated request. An operation listed under several tags now appears under each of them instead of only the first.

Request and response bodies route through the schema explorer, which understood only declared properties and `allOf`. A `oneOf` body rendered as a single object built from a generated example, so every branch but the first disappeared, and `additionalProperties` and `patternProperties` were dropped. The explorer now renders root alternatives, pattern properties, additional properties, and a closed-object note, and schemas using keywords it cannot express fall back to the recursive schema view rather than losing them.

`discriminator` is rendered for the first time: both schema surfaces name the property that selects the shape and label each alternative with the mapped value that chooses it.

A schema with no explicit `type` was labelled `object` and `const` was ignored entirely, so `{ const: 'card' }` displayed as an object whose example was the string `"string"`. Types now come from the const literal, the structural keywords, or a shared composed type, and read `any` only when nothing constrains the value.

Parameters declared with `content` rather than `schema` are described instead of showing an empty object — the Swagger 2 normalizer no longer fabricates a stand-in schema for OpenAPI 3 parameters. Parameter deprecation, serialization style, and named examples now render, as do a reusable header's required flag, deprecation, and examples, a reusable example's summary, and a Path Item's summary and description. An example's `externalValue` is presented as a link rather than as the payload, and field-level XML and external documentation are reachable again.
