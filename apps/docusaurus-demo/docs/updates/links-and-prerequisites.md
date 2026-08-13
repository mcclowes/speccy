---
title: Document workflows with links, prerequisites, and callbacks
description: Show readers what comes before an operation, what can follow its response, and which requests the API may send back.
---

# Document workflows with links, prerequisites, and callbacks

An endpoint rarely stands alone. Creating a payment may require a customer, and its successful response may lead naturally to fetching, capturing, or refunding that payment. If those relationships exist only in prose, readers have to reconstruct the workflow themselves.

Speccy combines three complementary forms of operation relationship:

- OpenAPI links describe what a caller can do after a particular response.
- `x-speccy-prerequisites` describes what must already have happened before the operation can be called.
- OpenAPI callbacks describe requests the API may later send to the caller.

Together they give an operation a useful sense of place: what gets you here, where can you go next, and what might come back to you?

## Use links for response-driven next steps

OpenAPI's standard Link Object belongs to a response. This matters because the next operation often depends on both the response status and data returned in its body.

```yaml
paths:
  /payments:
    post:
      operationId: createPayment
      summary: Create a payment
      responses:
        '201':
          description: Payment created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Payment'
          links:
            getPayment:
              operationId: getPayment
              description: Read the payment that was just created.
              parameters:
                paymentId: $response.body#/id

  /payments/{paymentId}:
    get:
      operationId: getPayment
      summary: Get a payment
      parameters:
        - name: paymentId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Payment found
```

The link says more than “these endpoints are related.” It says that `getPayment` becomes relevant after a `201`, and shows how the new payment ID flows into the next request.

Use a link when:

- The relationship begins with a specific response.
- A value from that response supplies a parameter or request body value.
- The linked operation is a likely next action, not a mandatory earlier step.

Prefer `operationId` when both operations are in the same description. Use `operationRef` when you need a JSON Reference-style pointer to an operation. Keep operation IDs unique and stable so links survive changes to summaries and tags.

## Use prerequisites for earlier requirements

OpenAPI links point forward from a response, but OpenAPI has no matching object for “do this first.” Speccy's `x-speccy-prerequisites` extension fills that gap.

```yaml
paths:
  /customers:
    post:
      operationId: createCustomer
      summary: Create a customer
      responses:
        '201':
          description: Customer created

  /payments:
    post:
      operationId: createPayment
      summary: Create a payment
      x-speccy-prerequisites:
        - operationId: createCustomer
          description: Create the customer who will own the payment.
      responses:
        '201':
          description: Payment created
```

Use a prerequisite when:

- Another operation creates a resource or state this request requires.
- A setup, authorization, or verification step must be completed first.
- Readers would otherwise discover the dependency only after a failed request.

The shortest form is an operation ID:

```yaml
x-speccy-prerequisites:
  - createCustomer
  - verifyCustomer
```

Use the object form when the reason is not obvious:

```yaml
x-speccy-prerequisites:
  - operationId: verifyCustomer
    description: Payments are available after identity verification succeeds.
```

The description should explain the dependency, not repeat the linked operation's summary.

## Use callbacks for API-initiated requests

An OpenAPI Callback Object describes a request that the API may send after the original operation. Its key is a runtime expression that tells the API where to send that request, commonly using a callback URL supplied in the request body.

```yaml
paths:
  /payments:
    post:
      operationId: createPayment
      summary: Create a payment
      callbacks:
        paymentStatus:
          '{$request.body#/callbackUrl}':
            post:
              summary: Report payment status
              description: Reports the final status of the payment.
              requestBody:
                required: true
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/PaymentStatus'
              responses:
                '204':
                  description: Status received
```

Speccy shows `Report payment status`, its `POST` method, and the `{$request.body#/callbackUrl}` expression in the collapsed workflow card. It renders the callback's full request and response contract below the main operation.

Use a callback when the API initiates a later HTTP request to a caller-provided URL. Don't use one for polling, a client-initiated follow-up request, or a webhook whose destination isn't established by this operation. Top-level OpenAPI webhooks are a better fit for independently registered event subscriptions.

The runtime expression is part of the contract. Make sure it points to a value the original request supplies, and document callback authentication and retry behavior in the callback operation's description.

The built-in Luma Library API demonstrates this pattern on `createBook`: callers can supply a status callback URL, and Luma reports whether catalog indexing succeeded using a signed callback request. It also defines a top-level `book.indexed` webhook for subscribers that register once and receive catalog events across many requests.

Use `x-speccy-webhooks` when an operation emits a top-level webhook and readers need to move between them:

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

Speccy shows the webhook under **Events emitted** on the triggering operation. On the webhook page, it derives the reverse **Triggered by operations** relationship from the same extension.

## Use all three to describe the full path

A payment workflow might read like this:

```text
Create customer → Create payment → Get payment
       prerequisite ↑       │     ↑ 201 response link
                          callback
                             ↓
                    Report payment status
```

On the `createPayment` page, Speccy presents these relationships together as workflow context. The reader can move backward to required setup, forward to likely next operations, and see which requests the API may send back without searching the sidebar or opening several endpoint descriptions.

This is navigation and documentation, not orchestration. Links don't call the next operation, prerequisites don't enforce server-side state, and callbacks don't register or deliver themselves. The API must still validate requirements, store callback destinations safely, authenticate deliveries, and handle retries.

## Keep the graph useful

Document meaningful workflow edges, not every operation that happens to touch the same resource. A dense graph is just another form of noise.

A good relationship answers at least one concrete question:

- What must I create or complete before this call?
- Which response makes the next call possible?
- Which returned value do I pass to that call?
- Where should I go to inspect or continue the result?
- Which later request will the API send me, and where will it send it?

Use tags and subgroups for broad organization. Use links, prerequisites, and callbacks for causal relationships between specific operations.

## Check the result

Make sure every referenced `operationId` exists and is unique. Then open the operation page and verify that the workflow reads in the right direction, descriptions add useful context, response parameter expressions point to fields the response actually returns, and callback expressions point to values the original request supplies.

See [OpenAPI extensions](../openapi-extensions.md#operation-workflows) for the compact extension reference.
