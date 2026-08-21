# Automatic commits

- After completing each coherent unit of work, run the relevant checks and commit it before moving to the next unit.
- Commit automatically without asking for confirmation. A request to avoid commits overrides this rule.
- Use a concise, imperative commit message that describes the completed change.
- Keep commits focused. Stage only files and hunks you changed, and inspect the staged diff before committing.
- Treat pre-existing and concurrent changes as belonging to the user or another agent. Never include, discard, hide, or overwrite them.
- Never amend, squash, rebase, push, or otherwise rewrite history unless explicitly requested.
- If unrelated changes make it unsafe to isolate your work, leave your changes uncommitted and report the obstruction.
- Do not create an empty commit when the task produces no file changes.

---

# Repository instructions

## Project identity

- `speccy.report` is the registered domain for Speccy. The documentation site and studio deploy to Vercel (`apps/docusaurus-demo/docusaurus.config.ts` branches on the `VERCEL` environment variable), but nothing in the repository maps `speccy.report` to that deployment, so do not assume DNS points at it.

## Public documentation

- Treat public documentation as part of every user-facing feature or behavior change.
- Update the relevant pages in `apps/docusaurus-demo/docs` in the same coherent unit of work as the implementation.
- Do not rely on repository or package READMEs as a substitute for public documentation.
- Add new public pages to `apps/docusaurus-demo/sidebars.ts` and link them from related pages where readers would look for them.
- Build the Docusaurus site before committing documentation changes.
