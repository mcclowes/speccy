---
title: Test API requests
description: Configure and send requests from a Speccy API reference.
---

# Test API requests

Speccy builds an interactive request from each OpenAPI operation. Readers can supply parameters and authorization, inspect the generated request sample, send it from the browser, and read the response beside the endpoint documentation.

Interactive requests are enabled by default. Set `tryIt={false}` in React, `renderer.tryIt: false` on a generated Docusaurus route, or `tryIt={false}` on the Docusaurus `OpenAPI` component to publish static request documentation instead.

## Choose a server

The request builder uses the first server available to the operation. OpenAPI resolves servers from the narrowest scope first: the operation, its path item, then the document.

```yaml
servers:
  - url: https://sandbox.example.com
    description: Sandbox
  - url: https://api.example.com
    description: Production
```

When an endpoint has more than one effective server, use **Endpoint availability** above the request builder to choose one. Speccy expands OpenAPI server variables before sending the request.

The browser sends requests directly to that server. The server must allow the documentation site's origin through CORS. A failed browser request can mean the URL is wrong, the network is unavailable, or the server rejected the cross-origin request.

## Add authorization

Open **Authorization** in the request builder and enter the credentials required by the operation. Speccy supports the security alternatives and combinations declared by the OpenAPI document for API keys and HTTP bearer or basic authentication. OAuth flows are documented in the reference, but the request builder doesn't run an OAuth authorization flow.

Credentials stay in the browser's local storage for that rendered API, so they can be reused between its endpoints. They are included in the request you send. Don't enter a production secret into a documentation site you don't trust, and don't put server-side credentials into a public OpenAPI document or frontend bundle.

The visible request sample masks credentials. Copying the sample includes the values needed to run the request, so treat copied commands as sensitive.

## Fill in parameters

Required path, query, header, and cookie parameters appear first. Select **Add optional parameter** to include an optional value. Speccy follows the parameter location, style, and explode rules in the OpenAPI document when it builds the URL, headers, and cookies.

When `parameterPrototype` is `false`, the builder shows the first optional parameters immediately and lets readers expand the rest. The default prototype keeps optional values out of the request until the reader adds them.

For operations with a request body, Speccy selects the first declared media type and starts with the best available example. Named examples can be selected from the request body card. If the document has no example, Speccy creates an initial value from the schema.

## Inspect and send the request

The request sample updates as values change. Use its language selector to switch between generated formats, or copy the current sample to run elsewhere.

Select **Send request** to call the API. Speccy shows the status and response body returned by the server. The call happens in the reader's browser; Speccy doesn't proxy it through a hosted service.

## Test a webhook

Webhook pages use the same controls in reverse. Enter the URL of the receiver you want to test, configure the documented payload, headers, and authorization, then select **Send test webhook**. The receiving server must allow the documentation origin through CORS.

See [OpenAPI extensions](./openapi-extensions.md#operation-workflows) for documenting the relationships between operations, callbacks, and webhooks.

## Publish requests safely

Disable interactive requests when a public reference shouldn't make live calls:

```tsx
<Speccy spec={spec} tryIt={false} />
```

This removes the request builder, generated request samples, and webhook tester. Response documentation remains available. See [Configuration](./configuration.md) for the complete renderer options.
