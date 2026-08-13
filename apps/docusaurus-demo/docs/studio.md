---
title: Speccy Studio
description: Open local, remote, and curated public OpenAPI documents in the web app.
---

# Speccy Studio

Speccy Studio is a browser-based workspace for exploring and reviewing OpenAPI documents. Open a YAML or JSON file, load a document by URL, or return to a recent reference stored on your device. Studio is read-only: it helps you understand and check a contract, but it doesn't replace your OpenAPI editor.

[Open Speccy Studio](https://app.speccy.report)

## Open a document

Use **Open a file** for a local `.yaml`, `.yml`, or `.json` document. You can also drop the file anywhere on the Studio window.

Use **Load from URL** when the document is publicly accessible from the browser. The server hosting it must allow cross-origin requests. Studio resolves relative external references against the document URL.

Local and remote documents appear under **Recent references** on that device. Studio stores the source needed to reopen a local document and the URL for a remote one in browser storage. Clearing the site's browser data removes that history.

## Explore the reference

Use the sidebar to browse tags, operations, webhooks, and reusable components. Filter the navigation by name, method, or path, or press Cmd/Ctrl+K to search from anywhere in the reference. Each operation has a stable route within the open reference, so navigation and shared links can point to the page you are viewing.

Endpoint pages include parameters, authorization, request and response bodies, examples, workflows, and interactive requests when the document provides them. See [Test API requests](./test-api-requests.md) for servers, credentials, CORS, and webhook testing.

## Review API health

Open the API health drawer to review correctness, documentation, design, and lifecycle findings. Studio also runs Spectral's standard OpenAPI ruleset and labels those findings separately.

Large documents are checked in the background after the reference renders. Studio prioritizes the page you are viewing, then processes the rest in bounded batches. The drawer reports the current phase, completed batches, and partial finding counts while work continues.

Studio doesn't write fixes back to the document. Use the finding's object path or source range to make the change in your editor. [Review API health](./api-health.md) explains the rule categories and how to run the same checks in the renderer, CLI, and GitHub Action.

## Explore public APIs

The home screen includes a small catalog of complex public APIs, including Stripe, GitHub, DigitalOcean, and Cloudflare. Select one to fetch its public OpenAPI document and open it in the same reference viewer used for your own specifications.

Large catalog specifications are processed in the browser. Studio keeps local references compact and passes the parsed document directly to the renderer, so highly connected documents such as Stripe don't expand into a much larger intermediate copy.

Catalog documents come from repositories maintained by each API provider. They can be large and may take a moment to parse. Speccy fetches the current document when you open a card, then keeps it in your recent references on that device.

## Share a preview

Use **Share** to copy a preview link for the reference. A local document is included in the link itself. A remote document stays linked to its source URL and is fetched again when the preview opens.

Preview links remove the Studio navigation and open directly into the rendered reference. They are suitable for review, not production hosting. A link containing a local document contains that document's contents, so don't share a private contract outside its intended audience.

Use the [React renderer](./react-renderer.md), [Docusaurus plugin](./docusaurus.md), or [standalone reference](./deployment.md#standalone-reference) when the reference needs a stable production home.

## Use the Mac app

The Mac app wraps Studio in an offline native window. It can open a single YAML or JSON document, or a folder containing a multi-document API. Opening a folder lets Speccy resolve relative `$ref` links to sibling files; when several documents could be the entry point, the app asks you to choose one.

The app also provides native Open, Reload, and Print commands. Its home screen discovers nearby Git repositories containing OpenAPI documents while skipping dependency and build folders.

There isn't a signed public download yet. Contributors can build the app locally by running `npm run build:mac` from the repository root; the command creates `apps/macos/Speccy.app`. macOS distribution requires your own signing and notarization identity.
