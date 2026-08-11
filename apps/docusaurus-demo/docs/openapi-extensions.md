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

## Tag subgroups

Use Speccy’s `x-tagSubgroup` extension on an operation to organize related paths within a tag:

```yaml
paths:
  /payments:
    post:
      tags: [Payments]
      x-tagSubgroup: Payment lifecycle
      summary: Create a payment
  /payments/{paymentId}:
    get:
      tags: [Payments]
      x-tagSubgroup: Payment lifecycle
      summary: Get a payment
```

Operations with the same tag and `x-tagSubgroup` value appear beneath a shared sidebar heading. Operations without `x-tagSubgroup` remain directly beneath the tag.

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

## Internal objects

Mark any OpenAPI object with `x-internal: true` to omit it from the rendered reference and the downloadable document. This works for operations, path items, webhooks, parameters, schema properties, and reusable components:

```yaml
paths:
  /admin/audit-log:
    get:
      x-internal: true
      summary: Read the audit log
```

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
