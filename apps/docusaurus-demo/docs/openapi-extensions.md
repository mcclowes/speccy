---
title: OpenAPI extensions
description: Organize and enrich a Speccy reference with vendor extensions.
---

# OpenAPI extensions

Speccy works with standard OpenAPI fields first. A small set of `x-` extensions handles presentation details that OpenAPI doesn’t model.

## Tag groups

Use Redocly’s `x-tagGroups` extension to place related tags beneath a shared sidebar heading:

```yaml
x-tagGroups:
  - name: Money movement
    tags:
      - Lending
      - Payments
  - name: Accounts
    tags:
      - Customers
      - Organizations
```

Tags omitted from every group still appear in the sidebar.

## Longer tag introductions

Standard `description` works well for a short summary. Use `x-longDescription` for setup steps or broader guidance on the tag overview page:

```yaml
tags:
  - name: Lending
    description: Create and service loans.
    x-longDescription: |
      ## Before you begin

      Create a customer and complete identity verification.
```

Both fields support Markdown.

## Tag icons

Use Speccy’s `x-icon` extension to show an image beside a tag in the sidebar and tag headings:

```yaml
tags:
  - name: Lending
    x-icon:
      url: /icons/lending.svg
      alt: Lending
```

`url` can be relative to the published site or an absolute image URL. SVG, PNG, and WebP all work when the browser supports them.

Use an empty `alt` value for a decorative icon. Add short alternative text only when the image communicates something the tag name doesn’t.
