---
'speccy-renderer': minor
'docusaurus-plugin-speccy': minor
---

Let the operation documentation components resolve themselves from an OpenAPI document. `href` is now optional on `OperationLink`, `EndpointStrip`, `OperationCard`, and `OperationPreview`: pass `spec` (and `basePath`) to one component, or wrap pages in the new `OperationReferenceProvider`, and each component derives its link from the operation's `operationId` while `OperationPreview` derives its examples. Paths accept OpenAPI `#variant` fragments, `operationId` looks operations and webhooks up directly while keeping a custom display path, `api` selects one of several named sources, and `requestExample`/`responseExample` accept plain objects.
