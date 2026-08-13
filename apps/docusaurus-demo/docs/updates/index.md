---
title: Updates
description: Speccy release notes, migration guidance, design notes, and practical API documentation tips.
slug: /updates
---

# Updates

This section brings Speccy's changes and the thinking behind them into one place. Expect four kinds of update:

- Release notes covering behavior that changed
- Migration guidance when an upgrade needs action
- Design notes explaining why a feature works the way it does
- Practical tips for writing API descriptions that are easier to use

Package changelogs remain the precise record for each release. Updates connect those entries into broader guidance, with examples you can apply to an API description.

## Release notes

Read the package changelogs for the complete record:

- [Renderer](https://github.com/mcclowes/speccy/blob/main/packages/renderer/CHANGELOG.md)
- [Docusaurus plugin](https://github.com/mcclowes/speccy/blob/main/packages/docusaurus-plugin/CHANGELOG.md)
- [CLI](https://github.com/mcclowes/speccy/blob/main/packages/cli/CHANGELOG.md)
- [Core](https://github.com/mcclowes/speccy/blob/main/packages/core/CHANGELOG.md)

## Latest guidance

### [Document operation workflows with links, prerequisites, and callbacks](./links-and-prerequisites.md)

Show readers what must happen before an operation, where they can go after its response, and which requests the API may send back.
