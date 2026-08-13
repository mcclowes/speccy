---
title: Review APIs in CI
description: Check OpenAPI changes in pull requests and configure Speccy's repository rules.
---

# Review APIs in CI

Speccy's GitHub Action compares OpenAPI documents with the pull request's base branch, checks the current documents for API health problems, and publishes one persistent review comment.

See [Review API health](./api-health.md) for the rule categories and how the same findings appear in the renderer and Studio.

## Add the GitHub Action

Check out the full Git history so Speccy can read the base branch:

```yaml title=".github/workflows/api-review.yml"
name: API review

on: pull_request

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: mcclowes/speccy@v1
        with:
          specs: |
            Public API=openapi.yaml
```

List several named documents when a repository owns more than one API:

```yaml
with:
  specs: |
    Admin=reference/admin.yml
    Public=reference/public.yml
```

For a generated document, provide explicit base and revision artifacts with `base-path=>revision-path`.

## Configure repository rules

Add an optional `.speccyrc` JSON file at the repository root. Without one, Speccy uses `speccy:recommended` and the default severity for every rule.

```json title=".speccyrc"
{
  "extends": ["speccy:recommended"],
  "rules": {
    "new-operation-lifecycle": {
      "severity": "suggestion",
      "maxAgeDays": 30,
      "allowedStages": ["new", "coming-soon", "beta", "early-access"]
    },
    "request-example": false,
    "response-example": "warning"
  },
  "ignore": [
    {
      "rules": ["operation-security", "request-example"],
      "paths": ["/public/**"]
    }
  ]
}
```

A rule accepts:

- `true` to keep its default severity
- `false` to disable it
- `"suggestion"`, `"warning"`, or `"issue"` to override its severity
- an options object for rules with additional settings

Unknown rules, properties, severities, and options fail the check. This catches misspelled configuration instead of silently weakening review. Contract-correctness rules, including duplicate operation IDs and broken path parameters, cannot be disabled or ignored.

## Ignore rules by API path

An `ignore` entry applies one or more rules to matching OpenAPI paths. `*` matches within one path segment; `**` crosses segments.

```json
{
  "ignore": [
    {
      "rules": ["operation-security"],
      "paths": ["/public/**", "/health"]
    }
  ]
}
```

These patterns match API paths such as `/public/forms/{formId}`, not files in the repository.

## Mark new operations

Change-aware linting suggests lifecycle metadata when a pull request adds an operation. Add the stage and the date it became available:

```yaml
paths:
  /exports:
    post:
      summary: Create an export
      x-speccy-lifecycle: new
      x-speccy-lifecycle-since: 2026-08-13
```

Speccy suggests removing `new` when the date is older than `maxAgeDays`. `coming-soon`, `beta`, and custom allowed stages do not expire automatically.

Disable this policy when it does not suit the repository:

```json title=".speccyrc"
{
  "rules": {
    "new-operation-lifecycle": false
  }
}
```

See [OpenAPI extensions](./openapi-extensions.md#operation-lifecycle) for how lifecycle metadata appears in the reference.

## Run the same checks locally

`speccy lint` reads the same `.speccyrc` file from the directory it runs in. `speccy diff` doesn't use the config; its severity is controlled by `--fail-on` alone:

```sh
npx speccy-cli lint openapi.yaml --against origin/main:openapi.yaml
npx speccy-cli diff origin/main:openapi.yaml openapi.yaml
```

Use `--format markdown` for output suitable for a pull request comment. Lint exits with code 1 when a finding reaches `--fail-on`; diff does the same for its configured change severity. Tool and parsing failures use code 2.

## Action inputs

| Input            | Default      | Purpose                                    |
| ---------------- | ------------ | ------------------------------------------ |
| `specs`          | required     | Named spec paths, one per line             |
| `version`        | `latest`     | Published `speccy-cli` version             |
| `fail-on`        | `breaking`   | Diff severity that fails the action        |
| `health-fail-on` | `never`      | Health severity that fails the action      |
| `comment`        | `true`       | Publish or update the pull request comment |
| `github-token`   | GitHub token | Token used to publish the comment          |
