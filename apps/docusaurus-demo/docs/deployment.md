---
title: Deployment
description: Build and publish a Speccy reference on a static host.
---

# Deployment

Speccy doesn’t need a server. A React app or Docusaurus site can publish the finished reference as static assets.

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
