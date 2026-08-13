# Repository instructions

## Project identity

- `speccy.report` is the registered domain for Speccy. The documentation site and studio deploy to Vercel (`apps/docusaurus-demo/docusaurus.config.ts` branches on the `VERCEL` environment variable), but nothing in the repository maps `speccy.report` to that deployment, so do not assume DNS points at it.

## Public documentation

- Treat public documentation as part of every user-facing feature or behavior change.
- Update the relevant pages in `apps/docusaurus-demo/docs` in the same coherent unit of work as the implementation.
- Do not rely on repository or package READMEs as a substitute for public documentation.
- Add new public pages to `apps/docusaurus-demo/sidebars.ts` and link them from related pages where readers would look for them.
- Build the Docusaurus site before committing documentation changes.
