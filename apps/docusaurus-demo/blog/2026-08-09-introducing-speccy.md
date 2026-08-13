---
title: Introducing Speccy
description: Meet Speccy, a calmer way to read, publish, and review OpenAPI documentation.
date: 2026-08-09
slug: introducing-speccy
authors: [speccy]
tags: [Speccy, OpenAPI]
---

# Introducing Speccy

OpenAPI is good at describing an API. Reading the result is often harder than it should be.

Large references become walls of expanding panels. Important context gets buried between schemas and examples. Teams work around the renderer in front of them, copying explanations into a second content system or accepting that their API documentation will always feel a little hostile.

Speccy is an OpenAPI renderer built to make that contract easier to read, publish, and maintain. It keeps the specification as the source of truth and gives the content room to breathe.

<!-- truncate -->

## The point of Speccy

API reference documentation has two jobs. It needs to help someone understand and use the API, and it needs to stay accurate as the API changes. Those jobs should support each other.

Speccy reads OpenAPI 3.x and Swagger 2 directly. There is no separate documentation model to keep in sync and no generated Markdown to review. Descriptions, examples, schemas, security requirements, links, callbacks, and reusable components remain in the contract where tools and people can both use them.

The renderer then gives each part a clear place. Endpoints have stable pages, large APIs are searchable, method colors carry meaning, and request tools sit beside the operation they exercise. The interface stays quiet around the content instead of asking every section to compete for attention.

That restraint is deliberate. Good reference documentation should help readers keep their place and answer the next question without making the machinery the main event.

## One contract, several places to read it

Speccy uses the same rendering core across its different surfaces:

- Add `speccy-renderer` to an existing React application.
- Publish reference routes beside guides with `docusaurus-plugin-speccy`.
- Create a dedicated static reference site with `create-speccy-reference`.
- Open a local or remote document in Speccy Studio when you want to inspect it without setting up a project.

The result looks and behaves consistently whether someone is reviewing a document, reading the public reference, or embedding an endpoint in a longer guide. Teams can choose where the docs live without choosing a different reading experience each time.

## Documentation starts before publication

A polished reference can still describe a broken API. Missing examples, unclear authentication, inconsistent pagination, and accidental breaking changes are easier to fix before they reach the docs site.

The Speccy CLI brings the same contract into code review. `speccy lint` checks API health and documentation quality. `speccy diff` compares revisions and reports breaking changes. The GitHub Action can leave those results on a pull request, where the team can address them alongside the code that caused them.

This closes a useful loop: write the contract, review the change, and publish the same document. The public reference is not a separate artifact assembled at the end.

## Where it goes from here

Speccy is for teams that want capable API tooling without a noisy reading experience or a proprietary content layer between them and their OpenAPI document. It is open source, works with static hosting, and leaves the surrounding application in your hands.

This updates section will cover new releases, design decisions, migration notes, and practical ways to document APIs. To try Speccy now, [get started with React, Docusaurus, or a standalone reference](/docs/getting-started), [open the Studio](/docs/studio), or [view the source on GitHub](https://github.com/mcclowes/speccy).
