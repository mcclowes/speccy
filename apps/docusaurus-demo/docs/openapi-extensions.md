---
title: OpenAPI extensions
description: Organize and enrich a Speccy reference with vendor extensions.
---

# OpenAPI extensions

Speccy works with standard OpenAPI fields first. A small set of `x-` extensions handles presentation details that OpenAPI doesn’t model.

## Operation lifecycle

Use `x-speccy-lifecycle` to show an operation's release stage in its heading and in navigation. `new`, `coming-soon`, and `beta` have distinct styles; other non-empty values use a neutral badge.

```yaml
paths:
  /exports:
    post:
      summary: Create an export
      x-speccy-lifecycle: new
      x-speccy-lifecycle-since: 2026-08-13
```

The optional `x-speccy-lifecycle-since` date lets change-aware linting suggest removing `new` after the age configured in `.speccyrc`. See [Review APIs in CI](./ci-review.md#mark-new-operations).

## Operation workflows

OpenAPI’s standard [Link Object](https://spec.openapis.org/oas/v3.1.2.html#link-object) describes an operation that a client may call after receiving a particular response. Speccy presents response links as possible next operations:

```yaml
paths:
  /customers:
    post:
      operationId: createCustomer
      responses:
        '201':
          description: Customer created
          links:
            getCustomer:
              operationId: getCustomer
              parameters:
                customerId: $response.body#/id
```

Callbacks describe requests the API may send after the operation. Speccy includes each callback operation and its runtime expression in the workflow band, then renders the full callback contract below the operation:

```yaml
paths:
  /payments:
    post:
      operationId: createPayment
      callbacks:
        paymentStatus:
          '{$request.body#/callbackUrl}':
            post:
              summary: Report payment status
              responses:
                '204':
                  description: Status received
```

OpenAPI has no equivalent reverse relationship for operations that must happen first. Use `x-speccy-prerequisites` with an array of operation IDs (or objects with `operationId`, `operationRef`, and an optional `description`):

```yaml
paths:
  /payments:
    post:
      operationId: createPayment
      x-speccy-prerequisites:
        - operationId: createCustomer
          description: Create the customer that owns the payment.
        - verifyCustomer
```

Speccy shows prerequisites, response links, and callbacks together in a compact workflow band on the operation page. These fields document workflow relationships; they do not make calls, register callback URLs, or enforce server-side state.

To connect a top-level webhook to the operations that may emit it, add `x-speccy-webhooks` to each triggering operation. Entries accept the same string, `operationId`, or `operationRef` forms as prerequisites:

```yaml
paths:
  /books:
    post:
      operationId: createBook
      x-speccy-webhooks:
        - operationId: bookIndexed
          description: Emitted after catalog indexing finishes.

webhooks:
  book.indexed:
    post:
      operationId: bookIndexed
      summary: Book indexed
```

Speccy lists `Book indexed` under **Events emitted** on `createBook`. The webhook's own workflow lists `Create book` under **Triggered by operations**. The reverse relationship is derived from `x-speccy-webhooks`, so it cannot drift independently.

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

Mark any OpenAPI object with `x-internal: true` to omit it from the rendered reference. This works for operations, path items, webhooks, parameters, schema properties, and reusable components:

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
