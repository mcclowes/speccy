# Release checklist

Changesets owns package versions and changelogs. All public Speccy packages are in one fixed group, so every release gives them the same version. The release workflow opens or updates a `Version packages` pull request whenever changesets land on `main`. Merging that pull request publishes to npm through trusted publishing with OIDC, creates GitHub releases, and moves the `v1` Action tag to the published commit.

## One-time setup

- [ ] Bootstrap any package name that doesn't exist on npm with one interactive `npm publish --access public` using 2FA. npm can't attach a trusted publisher until the package exists.
- [ ] In every package's npm settings, add a GitHub Actions trusted publisher for user `mcclowes`, repository `speccy`, and workflow `release.yml`. Allow `npm publish`.
- [ ] Keep Node 24 or newer and npm 11.5.1 or newer in the release job. Older npm clients can't exchange the GitHub OIDC identity for short-lived npm credentials. The workflow pins Node 24 and relies on its bundled npm; nothing asserts the npm version, so check it when changing the setup-node step.
- [ ] Keep `id-token: write` on the release job. No npm publish token or repository secret is needed.
- [ ] Confirm trusted publishing creates provenance automatically. Don't add a separate provenance token or disable provenance in package configuration.
- [ ] Allow GitHub Actions to create pull requests in the repository settings.
- [ ] Protect `main`, and require CI before merging the release pull request.
- [ ] Confirm the workflow has `contents: write` so Changesets can create package tags and GitHub releases, and so the workflow can move `v1`.

## Before merging a change

- [ ] Run `npm run check`.
- [ ] Run `npm run changeset` for each consumer-facing package change. Select the packages whose behavior changed; Changesets includes the rest of the fixed group when it prepares the release.
- [ ] Select the smallest correct SemVer bump and write a concise, consumer-facing summary.
- [ ] Check that internal package dependency ranges move to the shared release version in the `Version packages` pull request.
- [ ] Don't add changesets for private apps, tests, documentation-only changes, or internal refactors with no package behavior change.

## Release pull request

- [ ] Confirm every public package has the same version in the `Version packages` pull request.
- [ ] Review each generated `CHANGELOG.md`, including dependency-only release notes.
- [ ] Confirm `package-lock.json` contains the new workspace versions and internal dependency ranges.
- [ ] Let the full CI suite pass. The external-style Action fixture currently pins an older published CLI, so it exercises the Action wrapper rather than the release under review ([#32](https://github.com/mcclowes/speccy/issues/32)).
- [ ] Merge the release pull request without manually publishing or creating tags.

## After publication

- [ ] Confirm each expected version appears on npm and carries provenance. Trusted publishing generates the attestation automatically, and the npm package page should link it to this repository and workflow run.
- [ ] Confirm the install surface with `npm view <package>@<version>` for `speccy-core`, `speccy-spectral`, `speccy-cli`, `speccy-renderer`, `docusaurus-plugin-speccy`, and `create-speccy-reference` as applicable.
- [ ] Confirm Changesets created a GitHub release and immutable package tag for every published package.
- [ ] Confirm the mutable `v1` tag points at the release commit: `git ls-remote origin refs/tags/v1` must match the commit that published the packages. Don't trust a local `git rev-parse v1`; a plain fetch doesn't update a force-moved tag.
- [ ] Run the Action from a separate consumer repository with `uses: mcclowes/speccy@v1` before announcing the release.
- [ ] Check the release workflow summary and npm package contents for secrets or unexpected files.

## Recovering a partial release

Don't reuse a version that reached npm. Fix the cause, add a patch changeset for affected packages, and run the release flow again. If package publication succeeded but `v1` didn't move, verify the release commit, then move only the major tag:

```sh
git tag --force v1 <release-commit>
git push origin refs/tags/v1 --force
```

Never force-move package version tags. GitHub releases and package tags are the immutable audit trail; only `v1` is a moving compatibility alias.
