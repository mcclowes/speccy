# Changesets

Add a changeset for any pull request that changes a published package:

```sh
npm run changeset
```

Choose each affected package, select the SemVer bump, and describe the consumer-facing change. Documentation, tests, internal refactors, and changes limited to private apps don't need a changeset.

Merging to `main` updates the release pull request. Merging that pull request publishes the packages, creates GitHub releases, and moves the `v1` Action tag to the release commit.
