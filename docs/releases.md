# Release checklist

Changesets owns package versions and changelogs. The release workflow opens or updates a `Version packages` pull request whenever changesets land on `main`. Merging that pull request publishes to npm, creates GitHub releases, and moves the `v1` Action tag to the published commit.

## One-time setup

- [ ] Add an npm automation or granular access token as the `NPM_TOKEN` repository secret. It must be allowed to publish every public package in this monorepo.
- [ ] Keep `id-token: write` on the release job. npm uses the resulting OIDC statement to attach provenance to each package published with `NPM_CONFIG_PROVENANCE=true`.
- [ ] Allow GitHub Actions to create pull requests in the repository settings.
- [ ] Protect `main`, and require CI before merging the release pull request.
- [ ] Confirm the workflow has `contents: write` so Changesets can create package tags and GitHub releases, and so the workflow can move `v1`.

## Before merging a change

- [ ] Run `npm run check`.
- [ ] Run `npm run changeset` for each consumer-facing package change.
- [ ] Select the smallest correct SemVer bump and write a concise, consumer-facing summary.
- [ ] Check that changes to shared packages include affected dependents when their declared version ranges need to move.
- [ ] Don't add changesets for private apps, tests, documentation-only changes, or internal refactors with no package behavior change.

## Release pull request

- [ ] Review every version in the `Version packages` pull request.
- [ ] Review each generated `CHANGELOG.md`, including dependency-only release notes.
- [ ] Confirm `package-lock.json` contains the new workspace versions and internal dependency ranges.
- [ ] Let the full CI suite pass, including the external-style Action fixture.
- [ ] Merge the release pull request without manually publishing or creating tags.

## After publication

- [ ] Confirm each expected version appears on npm and carries provenance. The npm package page should show a provenance badge and link the package to this repository and workflow run.
- [ ] Confirm the install surface with `npm view <package>@<version>` for `speccy-core`, `speccy-spectral`, `speccy-cli`, `speccy-renderer`, `docusaurus-plugin-speccy`, and `create-speccy-reference` as applicable.
- [ ] Confirm Changesets created a GitHub release and immutable package tag for every published package.
- [ ] Confirm the mutable `v1` tag points at the release commit: `git rev-parse v1` must match the commit that published the packages.
- [ ] Run the Action from a separate consumer repository with `uses: mcclowes/speccy@v1` before announcing the release.
- [ ] Check the release workflow summary and npm package contents for secrets or unexpected files.

## Recovering a partial release

Don't reuse a version that reached npm. Fix the cause, add a patch changeset for affected packages, and run the release flow again. If package publication succeeded but `v1` didn't move, verify the release commit, then move only the major tag:

```sh
git tag --force v1 <release-commit>
git push origin refs/tags/v1 --force
```

Never force-move package version tags. GitHub releases and package tags are the immutable audit trail; only `v1` is a moving compatibility alias.
