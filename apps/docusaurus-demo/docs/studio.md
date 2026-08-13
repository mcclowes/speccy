---
title: Speccy Studio
description: Open local, remote, and curated public OpenAPI documents in the web app.
---

# Speccy Studio

Speccy Studio is a browser-based workspace for reading and reviewing OpenAPI documents. Open a YAML or JSON file, load a document by URL, or return to a recent reference stored on your device.

[Open Speccy Studio](https://app.speccy.report)

## Explore public APIs

The home screen includes a small catalog of complex public APIs, including Stripe, GitHub, DigitalOcean, and Cloudflare. Select one to fetch its public OpenAPI document and open it in the same reference viewer used for your own specifications.

Large catalog specifications are processed in the browser. The studio keeps shared schema data in memory once, so highly connected documents such as Stripe remain responsive while they load.

Catalog documents come from repositories maintained by each API provider. They can be large and may take a moment to parse. Speccy fetches the current document when you open a card, then keeps it in your recent references on that device.

## Open your own document

Use **Open a file** for a local `.yaml`, `.yml`, or `.json` document. You can also drop the file anywhere on the Studio window.

Use **Load from URL** when the document is publicly accessible from the browser. The server hosting it must allow cross-origin requests. Relative external references are resolved against the document URL.

Opened references are read-only. Use the share control to copy a self-contained preview link for a local document or a compact link back to a remote document.
