# Public package surface

Status: accepted, partially implemented (see status update below)

## Decision

Speccy presents four supported entry points:

- `speccy-renderer` for React applications
- `speccy-cli` for local and CI analysis
- `docusaurus-plugin-speccy` for Docusaurus sites
- `create-speccy-reference` for standalone reference sites

`speccy-core` remains published as the shared runtime dependency and an advanced headless API. It isn't presented as a separate product in introductory documentation. Its package boundary is useful because the CLI and renderer both consume it without coupling Node code to React.

`speccy-spectral` is internal infrastructure rather than a supported entry point. Before the next release, bundle its implementation into the packages that use it, then stop publishing it separately.

The Docusaurus plugin owns its renderer dependency. Installing the plugin must be enough to render a reference; users shouldn't have to understand Speccy's internal package graph.

## Why

Package boundaries should match choices users need to make. The four entry points correspond to distinct ways of using Speccy. Asking users to choose between foundational analysis packages exposes implementation details and makes installation harder to explain.

Keeping the headless core separate still gives advanced consumers a DOM-free API and lets the CLI and renderer share one implementation. Spectral doesn't have the same independent use case in Speccy, so a public package adds maintenance and release work without clarifying the product.

## Consequences

- Introductory docs list the four entry points, not every published workspace package.
- The core package can still document its advanced API and follows the same version as the public entry points.
- The Docusaurus plugin declares `speccy-renderer` as a runtime dependency.
- Release work must remove the standalone `speccy-spectral` artifact without duplicating its analysis logic across source trees.

## Status update (2026-08-11)

- `speccy-spectral` is still published and in the fixed release group; the bundling work hasn't happened and is tracked in [#31](https://github.com/mcclowes/speccy/issues/31).
- The Docusaurus plugin currently declares both `speccy-renderer` and `speccy-spectral` as runtime dependencies.
- The GitHub Action (`uses: mcclowes/speccy@v1`) is a consumer-facing surface that postdates this decision and isn't covered by it.
