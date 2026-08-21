---
'docusaurus-plugin-speccy': patch
'speccy-renderer': patch
---

Serve the published OpenAPI description under `docusaurus start`. The file was only emitted from `postBuild`, so the overview's link to it 404ed for the whole time an author worked locally. The plugin now writes the description into its generated files directory and mounts that directory on the dev server at the same URL.

The overview card also shows the description's URL instead of a second "Open OpenAPI description" label, and opens it in a new tab rather than navigating the reader out of the docs.
