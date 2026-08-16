---
title: Use Speccy with Posting
description: Move OpenAPI operations from Speccy into the Posting terminal client.
---

# Use Speccy with Posting

[Posting](https://posting.sh/) is a terminal HTTP client that stores requests as readable YAML files. Speccy can hand off one configured request at a time, while Posting can import a complete OpenAPI document as a collection.

## Copy one configured request

Open an endpoint in Speccy, fill in its parameters, body, and authorization, then expand **Code snippet** and choose **Posting**. Copy the result into a file whose name ends in `.posting.yaml`:

```yaml
name: POST /companies
method: POST
url: https://api.example.com/companies
body:
  content: '{"name":"Acme"}'
headers:
  - name: Content-Type
    value: application/json
```

Place the file in a Posting collection, then open that directory:

```sh
posting --collection ./api-requests
```

The copied sample contains the values currently entered in Speccy. That includes unmasked authorization values, so don't commit secrets to the collection.

## Import the whole OpenAPI document

Posting can turn an OpenAPI 3.x document into a collection:

```sh
posting import openapi.yaml -o ./api-requests
posting --collection ./api-requests
```

Posting's OpenAPI import is experimental. If the document uses external references, bundle it first so Posting receives one self-contained file:

```sh
npx redocly bundle openapi.yaml --output openapi.bundled.yaml
posting import openapi.bundled.yaml -o ./api-requests
```

Re-importing may replace edits made to generated request files. Keep hand-written requests separate, or inspect the diff before committing an updated collection.

## Keep credentials out of request files

Posting supports variables such as `${API_TOKEN}` in request fields. Put their values in a local environment file, then start Posting with it:

```dotenv title="development.env"
API_TOKEN=replace-me
```

```sh
posting --collection ./api-requests --env development.env
```

You can also name the file `posting.env`; Posting loads that file automatically when no `--env` option is supplied. Ignore credential-bearing environment files in version control.

See [Test API requests](./test-api-requests.md) for how Speccy builds requests and handles authorization.
