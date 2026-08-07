---
title: Deployment
description: Build and publish a Speccy reference on a static host.
---

# Deployment

Speccy doesn’t need a server. A standalone reference, React app, or Docusaurus site can publish the finished reference as static assets.

## Standalone reference

Create and build a dedicated reference site:

```sh
npm create speccy-reference my-api-reference
cd my-api-reference
npm install
npm run build
```

Publish the generated `dist` directory. The starter includes rewrite configuration for Netlify and Vercel. On another host, rewrite unknown paths to `index.html` so direct visits to operation URLs load the application shell.

Set `basePath` in `speccy.config.ts` when the reference lives below the domain root. A reference published at `https://example.com/api/` should use `/api/`.

Use `spec` for a local YAML or JSON file. Add `specUrl` to fetch a remote document at build time. Prefer a pinned or versioned URL in production so an upstream change can’t alter the next build without review.

## Docusaurus

Build the site normally:

```sh
npm run build
```

Deploy the generated `build` directory to your host. If the site lives below a domain subpath, set Docusaurus `baseUrl` and keep the plugin route relative to it.

## React applications

Speccy creates client-side URLs for endpoint and reference pages. Configure a fallback so direct visits return the application shell rather than a 404.

For example, a reference mounted with `basePath="/api"` needs `/api/*` rewritten to the page that mounts Speccy.

## Remote specifications

The standalone renderer leaves fetching to your application. The Docusaurus plugin fetches `specUrl` during the build, so the result remains a static site.

Prefer a pinned or versioned specification URL in production. If the remote document changes unexpectedly, the next build can change your public reference without a code review.
