import { describe, expect, it } from 'vitest';
import { createReferenceModel, parseSpec, slugify } from './model';

describe('parseSpec', () => {
  it('parses YAML and JSON input', () => {
    expect(parseSpec('openapi: 3.1.0\ninfo:\n  title: Test').info?.title).toBe('Test');
    expect(parseSpec('{"openapi":"3.0.0"}').openapi).toBe('3.0.0');
  });

  it('rejects scalar documents', () => {
    expect(() => parseSpec('hello')).toThrow('must be an object');
  });
});

describe('createReferenceModel', () => {
  it('keeps operations in their YAML declaration order', () => {
    const document = parseSpec(`
openapi: 3.1.0
paths:
  /corporates/kyb:
    post:
      summary: Start KYB for a corporate
      tags: [Corporates]
    get:
      summary: Get KYB for a corporate
      tags: [Corporates]
  /corporates/{id}:
    patch:
      summary: Update a corporate
      tags: [Corporates]
`);

    const model = createReferenceModel(document);

    expect(model.tags[0]?.operations.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'post /corporates/kyb',
      'get /corporates/kyb',
      'patch /corporates/{id}',
    ]);
  });

  it('groups operations by tag and gives duplicate IDs a stable suffix', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      tags: [{
        name: 'Pets',
        description: 'Pet things',
        'x-longDescription': 'Everything you need to manage pets.',
        'x-icon': { url: '/icons/pets.svg', alt: 'Paw' },
      }],
      paths: {
        '/pets': {
          get: { tags: ['Pets'], operationId: 'listPets' },
          post: { tags: ['Pets'], operationId: 'listPets' },
        },
      },
    });

    expect(model.tags[0]?.name).toBe('Pets');
    expect(model.tags[0]?.description).toBe('Pet things');
    expect(model.tags[0]?.longDescription).toBe('Everything you need to manage pets.');
    expect(model.tags[0]?.icon).toEqual({ url: '/icons/pets.svg', alt: 'Paw' });
    expect(model.operations.map(({ id }) => id)).toEqual(['listpets', 'listpets-2']);
  });

  it('groups tags using the Redocly x-tagGroups extension', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      tags: [{ name: 'Setup' }, { name: 'Sign-in' }, { name: 'Internal' }],
      'x-tagGroups': [{ name: 'Users & authentication', tags: ['Setup', 'Sign-in'] }],
      paths: {
        '/users': { post: { tags: ['Setup'], summary: 'Register a user' } },
        '/sessions': { post: { tags: ['Sign-in'], summary: 'Sign in' } },
        '/internal': { get: { tags: ['Internal'], summary: 'Internal operation' } },
      },
    });

    expect(model.tagGroups.map((group) => ({
      name: group.name,
      tags: group.tags.map((tag) => tag.name),
    }))).toEqual([{ name: 'Users & authentication', tags: ['Setup', 'Sign-in'] }]);
    expect(model.tags.map((tag) => tag.name)).toEqual(['Setup', 'Sign-in', 'Internal']);
    expect(model.operations).toHaveLength(3);
  });

  it('rejects documents without an OpenAPI version', () => {
    expect(() => createReferenceModel({ paths: {} })).toThrow('openapi or swagger');
  });

  it('resolves $ref parameters against components.parameters', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {
        '/companies/{companyId}/connections': {
          get: {
            operationId: 'list-connections',
            parameters: [
              { $ref: '#/components/parameters/companyId' },
              { $ref: '#/components/parameters/page' },
            ],
          },
        },
      },
      components: {
        parameters: {
          companyId: { name: 'companyId', in: 'path', required: true, schema: { type: 'string' } },
          page: { name: 'page', in: 'query', schema: { type: 'integer' } },
        },
      },
    });

    const parameters = model.operations[0]?.operation.parameters ?? [];
    expect(parameters.map((parameter) => parameter.name)).toEqual(['companyId', 'page']);
    expect(parameters[0]?.in).toBe('path');
  });

  it('resolves $ref schemas nested inside request and response bodies', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {
        '/pets': {
          post: {
            operationId: 'createPet',
            requestBody: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
            },
            responses: {
              '200': {
                description: 'OK',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Pet: { type: 'object', properties: { name: { type: 'string' } } },
        },
      },
    });

    const operation = model.operations[0]?.operation;
    const requestSchema = operation?.requestBody?.content?.['application/json']?.schema;
    const responseSchema = operation?.responses?.['200']?.content?.['application/json']?.schema;
    expect(requestSchema?.properties?.name?.type).toBe('string');
    expect(responseSchema?.properties?.name?.type).toBe('string');
    expect(requestSchema?.title).toBe('Pet');
    expect(responseSchema?.title).toBe('Pet');
  });

  it('keeps an explicit schema title when resolving a $ref', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } },
              },
            },
          },
        },
      },
      components: {
        schemas: { Pet: { title: 'Animal', type: 'object' } },
      },
    });

    const schema = model.operations[0]?.operation.responses?.['200']?.content?.['application/json']?.schema;
    expect(schema?.title).toBe('Animal');
  });

  it('does not hang on circular $ref schemas', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {
        '/nodes': {
          get: {
            operationId: 'getNode',
            responses: {
              '200': {
                description: 'OK',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Node: {
            type: 'object',
            properties: {
              children: { type: 'array', items: { $ref: '#/components/schemas/Node' } },
            },
          },
        },
      },
    });

    const schema = model.operations[0]?.operation.responses?.['200']?.content?.['application/json']?.schema;
    expect(schema?.properties?.children?.items?.$ref).toBe('#/components/schemas/Node');
  });

  it('expands discriminator mappings into their allOf subtype choices', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {
        '/cards': {
          post: {
            requestBody: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ManagedCardRequest' } } },
            },
          },
        },
      },
      components: {
        schemas: {
          ManagedCardRequest: {
            type: 'object',
            required: ['mode'],
            properties: { mode: { type: 'string' } },
            discriminator: {
              propertyName: 'mode',
              mapping: {
                PREPAID_MODE: '#/components/schemas/PrepaidModeCardRequest',
                DEBIT_MODE: '#/components/schemas/DebitModeCardRequest',
              },
            },
          },
          PrepaidModeCardRequest: {
            allOf: [
              { $ref: '#/components/schemas/ManagedCardRequest' },
              { type: 'object', required: ['currency'], properties: { currency: { type: 'string' } } },
            ],
          },
          DebitModeCardRequest: {
            allOf: [
              { $ref: '#/components/schemas/ManagedCardRequest' },
              { type: 'object', required: ['parentManagedAccountId'], properties: { parentManagedAccountId: { type: 'string' } } },
            ],
          },
        },
      },
    });

    const schema = model.operations[0]?.operation.requestBody?.content?.['application/json']?.schema;
    expect(schema?.oneOf?.map((choice) => choice.title)).toEqual([
      'PrepaidModeCardRequest',
      'DebitModeCardRequest',
    ]);
    expect(schema?.oneOf?.[0]?.allOf?.[1]?.required).toEqual(['currency']);
    expect(schema?.oneOf?.[1]?.allOf?.[1]?.required).toEqual(['parentManagedAccountId']);
  });

  it('normalizes Swagger 2 servers, body parameters, responses, and definitions', () => {
    const model = createReferenceModel({
      swagger: '2.0', host: 'api.example.com', basePath: '/v2', schemes: ['https'],
      consumes: ['application/json'], produces: ['application/json'],
      paths: { '/pets': { post: {
        parameters: [{ name: 'pet', in: 'body', required: true, schema: { $ref: '#/definitions/Pet' } }],
        responses: { '201': { description: 'Created', schema: { $ref: '#/definitions/Pet' } } },
      } } },
      definitions: { Pet: { type: 'object', properties: { name: { type: 'string' } } } },
    });

    expect(model.document.servers?.[0]?.url).toBe('https://api.example.com/v2');
    expect(model.document.components?.schemas?.Pet?.properties?.name?.type).toBe('string');
    expect(model.operations[0]?.operation.parameters).toEqual([]);
    expect(model.operations[0]?.operation.requestBody?.content?.['application/json']?.schema?.properties?.name?.type).toBe('string');
    expect(model.operations[0]?.operation.responses?.['201']?.content?.['application/json']?.schema?.properties?.name?.type).toBe('string');
  });

  it('collects top-level webhook operations separately from API paths', () => {
    const model = createReferenceModel({
      openapi: '3.1.0', paths: {},
      webhooks: {
        paymentReceived: {
          post: { operationId: 'paymentReceived', summary: 'Payment received' },
          get: { operationId: 'inspectPayment', summary: 'Inspect payment' },
        },
        systemReady: { post: { operationId: 'systemReady', summary: 'System ready' } },
      },
    });

    expect(model.operations).toHaveLength(0);
    expect(model.webhooks.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'post paymentReceived',
      'get paymentReceived',
      'post systemReady',
    ]);
  });

  it('adds tagged webhooks to their tag and groups untagged webhooks under Other webhooks', () => {
    const model = createReferenceModel({
      openapi: '3.1.0', paths: {},
      tags: [{ name: 'Payments', description: 'Payment events.' }],
      webhooks: {
        paymentReceived: { post: { tags: ['Payments'], summary: 'Payment received' } },
        systemReady: { post: { summary: 'System ready' } },
      },
    });

    expect(model.tags).toMatchObject([
      { name: 'Payments', operations: [{ source: 'webhook', path: 'paymentReceived' }] },
      { name: 'Other webhooks', operations: [{ source: 'webhook', path: 'systemReady' }] },
    ]);
    expect(model.webhooks).toHaveLength(2);
  });
});

describe('slugify', () => {
  it('creates anchor-safe IDs', () => {
    expect(slugify('GET /pets/{petId}')).toBe('get-pets-petid');
  });
});
