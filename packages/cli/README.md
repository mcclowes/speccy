# speccy-cli

Lint OpenAPI documents and report breaking changes from the command line, so the same analysis the [Speccy renderer](https://www.npmjs.com/package/speccy-renderer) shows in the browser can run in CI.

```sh
npm install --save-dev speccy-cli
```

Requires Node.js 22 or newer.

## Commands

```sh
speccy lint <spec> [options]
speccy diff <base> <revision> [options]
```

Every spec argument accepts three forms:

- an http or https URL
- a file path, `openapi.yaml`
- a git ref, `main:openapi.yaml` or `origin/main:api/openapi.yaml`

Resolution tries a URL first, then an existing file, then a git ref, so a local file whose name contains a colon shadows the same-named ref.

That makes the common CI comparison a one-liner:

```sh
speccy diff origin/main:openapi.yaml openapi.yaml
```

If the diff base ref exists but does not contain the file, the spec is new on this branch and `diff` exits clean. A missing revision or lint target is an error. If the ref itself is unreachable, which usually means a shallow clone, the command says so rather than reporting your whole API as added.

## Bundle multi-document specs

`speccy-cli` doesn't include a bundle command. Use the open-source [Redocly CLI](https://redocly.com/docs/cli/commands/bundle/) to create a standard YAML or JSON document before passing it to tools that don't load external references:

```sh
npx redocly bundle openapi.yaml --output openapi.bundled.yaml
```

## Options

| Option                              | Meaning                                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--format <pretty\|json\|markdown>` | Output shape. `pretty` for a terminal, `json` for anything downstream, `markdown` for a pull request comment. Defaults to `pretty`.                                                                                      |
| `--fail-on <severity>`              | Exit 1 at or above this severity. Lint takes `issue`, `warning`, `suggestion`, or `never`, defaulting to `issue`. Diff takes `breaking`, `warning`, `compatible`, `documentation`, or `never`, defaulting to `breaking`. |
| `--against <spec>`                  | Adds change-safety findings to a lint by comparing against a previous document.                                                                                                                                          |
| `--no-color`                        | Never colorize terminal output. `NO_COLOR` is respected too.                                                                                                                                                             |
| `--help`, `-h`                      | Print usage and exit 0.                                                                                                                                                                                                  |

## Repository configuration

Add an optional `.speccyrc` JSON file to configure rules. The CLI reads it from the directory it runs in, so run `speccy` from the directory containing `.speccyrc`; the GitHub Action runs at the workspace root and picks up a root-level file. `speccy:recommended` is the default preset. A rule accepts `true`, `false`, a severity, or an options object:

```json
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

Scoped ignores use `*` within one path segment and `**` across segments. Unknown rules, properties, severities, and options are rejected, so a typo cannot silently weaken review. Contract-correctness rules such as `operation-id-unique` and `path-parameter-declared` cannot be disabled or ignored.

When linting with `--against`, `new-operation-lifecycle` suggests adding lifecycle metadata to newly added operations. Add a date and any lint, with or without `--against`, suggests removing the badge after `maxAgeDays`; that finding reports under the `new-operation-lifecycle-expired` rule ID while reading its `maxAgeDays` from the `new-operation-lifecycle` setting:

```yaml
x-speccy-lifecycle: new
x-speccy-lifecycle-since: 2026-08-13
```

The GitHub Action uses change-aware linting, so it follows the same configuration.

## Exit codes

| Code | Meaning                            |
| ---- | ---------------------------------- |
| 0    | Nothing at or above the threshold  |
| 1    | Findings at or above the threshold |
| 2    | The tool could not run             |

Code 2 is deliberately separate: a spec that will not parse is a different problem from a spec with breaking changes, and CI should be able to tell them apart.

## In a workflow

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- run: npx speccy-cli diff origin/main:openapi.yaml openapi.yaml --format markdown >> "$GITHUB_STEP_SUMMARY"
```

`fetch-depth: 0` matters. The default shallow checkout has no `origin/main` to read the base from.

## License

MIT
