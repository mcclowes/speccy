---
title: Review API health
description: Find OpenAPI correctness, design, and change-safety problems in Speccy.
---

# Review API health

Speccy applies the same API health rules in the renderer, Studio, CLI, and GitHub Action. Use the browser while shaping a contract, the CLI before committing it, and the Action to keep the check attached to each pull request.

## What Speccy checks

The built-in rules cover:

- OpenAPI correctness, including duplicate operation IDs and broken path parameters
- documentation, operations, and resource design
- errors, authentication, pagination, and data modeling
- lifecycle design, including webhook envelopes and release-stage metadata
- change safety when a previous specification is available

Findings have an issue, warning, or suggestion severity. Contract-correctness rules can't be disabled because an invalid document makes later analysis unreliable.

## Review findings in the renderer

Enable developer hints in an internal or authoring view:

```tsx
<Speccy spec={currentSpec} showDeveloperHints />
```

The API health drawer groups findings across the document. Contextual hints also appear beside the operation or object they describe. Developer hints are off by default, don't appear in print output, and should stay off in public preview links.

Ignored rules are stored in the browser for each rendered API. Use a repository `.speccyrc` when the decision should apply to everyone and run in CI.

## Check changes against a previous version

Pass `previousSpec` to add change-safety findings:

```tsx
<Speccy spec={currentSpec} previousSpec={publishedSpec} showDeveloperHints />
```

Speccy checks for removed operations and responses, new required inputs, narrowed enums, response-shape changes, and stricter authentication. The current and previous values can be objects, YAML strings, or JSON strings.

For a standalone semantic change report, use `speccy diff` or the renderer's `SpecDiff` component. See [Review APIs in CI](./ci-review.md) for the CLI, GitHub Action, thresholds, and repository configuration.

## Include Spectral findings

Speccy's rules and Spectral answer different questions. Speccy focuses on API design and change safety; Spectral checks an OpenAPI ruleset supplied by the host.

The Docusaurus plugin runs Spectral during local development. Studio runs it when opening a document. A custom React host can pass the results of its own Spectral run:

```tsx
<Speccy spec={spec} showDeveloperHints spectralDiagnostics={spectralResults} />
```

Speccy preserves the rule ID, severity, object path, and source range, and labels Spectral findings separately from its built-in guidance.

## Review large documents in Studio

Studio starts API health checks after the reference appears. For large documents, it checks the page you are viewing first, then processes the rest in bounded batches. The drawer reports the current phase, completed batches, and partial finding totals while work continues.

Studio is read-only, so use a finding's location to change the source document in your editor. See [Speccy Studio](./studio.md) for opening, navigating, and sharing a document.

## Enforce the review

Run the same rules locally:

```sh
npx speccy-cli lint openapi.yaml
npx speccy-cli lint openapi.yaml --against origin/main:openapi.yaml
```

Add the GitHub Action when every pull request should receive the review. Its `health-fail-on` input controls which health severity fails the job, while `fail-on` controls semantic changes. See [Review APIs in CI](./ci-review.md) for the complete setup.
