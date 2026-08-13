import { describe, expect, it } from 'vitest';
import { createReferenceModel, parseSpec, slugify } from './model';
import type { SchemaObject } from './types';

describe('parseSpec', () => {
  it('parses YAML and JSON input', () => {
    expect(parseSpec('openapi: 3.1.0\ninfo:\n  title: Test').info?.title).toBe(
      'Test',
    );
    expect(parseSpec('{"openapi":"3.0.0"}').openapi).toBe('3.0.0');
  });

  it('rejects scalar documents', () => {
    expect(() => parseSpec('hello')).toThrow('must be an object');
  });
});

describe('OpenAPI 3.1 references', () => {
  it('resolves reusable path items and preserves reference siblings', () => {
    const model = createReferenceModel({
      openapi: '3.1.1',
      info: { title: 'Referenced paths', version: '1.0.0' },
      paths: {
        '/pets': {
          $ref: '#/components/pathItems/Pets',
          summary: 'Public pets',
        },
      },
      components: {
        pathItems: {
          Pets: {
            summary: 'Shared pets',
            get: {
              operationId: 'listPets',
              responses: { '200': { description: 'Pets' } },
            },
          },
        },
      },
    });

    expect(model.operations.map((operation) => operation.id)).toEqual([
      'listpets',
    ]);
    expect(model.operations[0]?.pathItem.summary).toBe('Public pets');
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

    expect(
      model.tags[0]?.operations.map(({ method, path }) => `${method} ${path}`),
    ).toEqual([
      'post /corporates/kyb',
      'get /corporates/kyb',
      'patch /corporates/{id}',
    ]);
  });

  it('groups operations by tag and gives duplicate IDs a stable suffix', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      tags: [
        {
          name: 'Pets',
          description: 'Pet things',
          'x-longDescription': 'Everything you need to manage pets.',
          'x-icon': { url: '/icons/pets.svg', alt: 'Paw' },
        },
      ],
      paths: {
        '/pets': {
          get: { tags: ['Pets'], operationId: 'listPets' },
          post: { tags: ['Pets'], operationId: 'listPets' },
        },
      },
    });

    expect(model.tags[0]?.name).toBe('Pets');
    expect(model.tags[0]?.description).toBe('Pet things');
    expect(model.tags[0]?.longDescription).toBe(
      'Everything you need to manage pets.',
    );
    expect(model.tags[0]?.icon).toEqual({ url: '/icons/pets.svg', alt: 'Paw' });
    expect(model.operations.map(({ id }) => id)).toEqual([
      'listpets',
      'listpets-2',
    ]);
  });

  it('groups tags using the Redocly x-tagGroups extension', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      tags: [{ name: 'Setup' }, { name: 'Sign-in' }, { name: 'Internal' }],
      'x-tagGroups': [
        { name: 'Users & authentication', tags: ['Setup', 'Sign-in'] },
      ],
      paths: {
        '/users': { post: { tags: ['Setup'], summary: 'Register a user' } },
        '/sessions': { post: { tags: ['Sign-in'], summary: 'Sign in' } },
        '/internal': {
          get: { tags: ['Internal'], summary: 'Internal operation' },
        },
      },
    });

    expect(
      model.tagGroups.map((group) => ({
        name: group.name,
        tags: group.tags.map((tag) => tag.name),
      })),
    ).toEqual([{ name: 'Users & authentication', tags: ['Setup', 'Sign-in'] }]);
    expect(model.tags.map((tag) => tag.name)).toEqual([
      'Setup',
      'Sign-in',
      'Internal',
    ]);
    expect(model.operations).toHaveLength(3);
  });

  it('hides operations and webhooks marked x-internal', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {
        '/pets': {
          get: { operationId: 'listPets' },
          post: { operationId: 'createPet', 'x-internal': true },
        },
        '/admin': {
          'x-internal': true,
          get: { operationId: 'adminDashboard' },
        },
      },
      webhooks: {
        petCreated: { post: { operationId: 'petCreated', 'x-internal': true } },
      },
    });

    expect(model.operations.map(({ id }) => id)).toEqual(['listpets']);
    expect(model.webhooks).toEqual([]);
    expect(model.document.paths?.['/admin']).toBeUndefined();
  });

  it('hides internal parameters, schema properties, and reusable components', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {
        '/pets': {
          get: {
            operationId: 'listPets',
            parameters: [
              { name: 'page', in: 'query', schema: { type: 'integer' } },
              {
                name: 'debug',
                in: 'query',
                schema: { type: 'boolean' },
                'x-internal': true,
              },
            ],
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Pet' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Pet: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              supportNotes: { type: 'string', 'x-internal': true },
            },
          },
          AdminPet: { type: 'object', 'x-internal': true },
        },
      },
    });

    const operation = model.operations[0]?.operation;
    const responseSchema =
      operation?.responses?.['200']?.content?.['application/json']?.schema;
    expect(operation?.parameters?.map(({ name }) => name)).toEqual(['page']);
    expect((responseSchema as SchemaObject)?.properties).toEqual({
      name: { type: 'string' },
    });
    expect(model.document.components?.schemas?.AdminPet).toBeUndefined();
  });

  it('resolves internal schemas referenced by public responses without listing them', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {
        '/integrity': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/DataIntegritySummaries',
                    },
                  },
                },
              },
              '201': {
                description: 'Created',
                content: {
                  'application/json': {
                    schema: {
                      'x-internal': true,
                      type: 'object',
                      properties: {
                        result: { type: 'string' },
                        debugNotes: {
                          type: 'string',
                          'x-internal': true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          DataIntegritySummaries: {
            title: 'Data integrity summaries',
            'x-internal': true,
            type: 'object',
            properties: {
              debugNotes: { type: 'string', 'x-internal': true },
              summaries: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/DataIntegritySummary',
                },
              },
            },
          },
          DataIntegritySummary: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Matched data type.' },
            },
          },
        },
      },
    });

    const schema =
      model.operations[0]?.operation.responses?.['200']?.content?.[
        'application/json'
      ]?.schema;
    expect(schema).toMatchObject({
      title: 'Data integrity summaries',
      type: 'object',
      properties: {
        summaries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Matched data type.' },
            },
          },
        },
      },
    });
    expect((schema as SchemaObject)?.properties?.debugNotes).toBeUndefined();
    expect(
      model.document.components?.schemas?.DataIntegritySummaries,
    ).toBeUndefined();
    expect(
      model.operations[0]?.operation.responses?.['201']?.content?.[
        'application/json'
      ]?.schema,
    ).toEqual({
      type: 'object',
      properties: { result: { type: 'string' } },
    });
  });

  it('preserves x-internal fields inside literal example data', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {
        '/status': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    example: { 'x-internal': true, status: 'visible' },
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(
      model.operations[0]?.operation.responses?.['200']?.content?.[
        'application/json'
      ]?.example,
    ).toEqual({ 'x-internal': true, status: 'visible' });
  });

  it('preserves shared schema subtrees when resolving repeated references', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {
        '/one': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Envelope' },
                  },
                },
              },
            },
          },
        },
        '/two': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Envelope' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Envelope: {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/SharedData' },
            },
          },
          SharedData: {
            type: 'object',
            properties: { id: { type: 'string' } },
          },
        },
      },
    });
    const schemas = model.operations.map(
      (operation) =>
        operation.operation.responses?.['200']?.content?.['application/json']
          ?.schema as SchemaObject,
    );

    expect(schemas[0]?.properties?.data).toBe(schemas[1]?.properties?.data);
  });

  it('rejects documents without an OpenAPI version', () => {
    expect(() => createReferenceModel({ paths: {} })).toThrow(
      'openapi or swagger',
    );
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
          companyId: {
            name: 'companyId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          page: { name: 'page', in: 'query', schema: { type: 'integer' } },
        },
      },
    });

    const parameters = model.operations[0]?.operation.parameters ?? [];
    expect(parameters.map((parameter) => parameter.name)).toEqual([
      'companyId',
      'page',
    ]);
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
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Pet' },
                },
              },
            },
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Pet' },
                  },
                },
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
    const requestSchema =
      operation?.requestBody?.content?.['application/json']?.schema;
    const responseSchema =
      operation?.responses?.['200']?.content?.['application/json']?.schema;
    expect(
      ((requestSchema as SchemaObject)?.properties?.name as SchemaObject)?.type,
    ).toBe('string');
    expect(
      ((responseSchema as SchemaObject)?.properties?.name as SchemaObject)
        ?.type,
    ).toBe('string');
    expect((requestSchema as SchemaObject)?.title).toBe('Pet');
    expect((responseSchema as SchemaObject)?.title).toBe('Pet');
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
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Pet' },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: { Pet: { title: 'Animal', type: 'object' } },
      },
    });

    const schema =
      model.operations[0]?.operation.responses?.['200']?.content?.[
        'application/json'
      ]?.schema;
    expect((schema as SchemaObject)?.title).toBe('Animal');
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
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Node' },
                  },
                },
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
              children: {
                type: 'array',
                items: { $ref: '#/components/schemas/Node' },
              },
            },
          },
        },
      },
    });

    const schema =
      model.operations[0]?.operation.responses?.['200']?.content?.[
        'application/json'
      ]?.schema;
    expect(
      (
        ((schema as SchemaObject)?.properties?.children as SchemaObject)
          ?.items as SchemaObject
      )?.$ref,
    ).toBe('#/components/schemas/Node');
  });

  it('expands discriminator mappings into their allOf subtype choices', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {
        '/cards': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ManagedCardRequest' },
                },
              },
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
              {
                type: 'object',
                required: ['currency'],
                properties: { currency: { type: 'string' } },
              },
            ],
          },
          DebitModeCardRequest: {
            allOf: [
              { $ref: '#/components/schemas/ManagedCardRequest' },
              {
                type: 'object',
                required: ['parentManagedAccountId'],
                properties: { parentManagedAccountId: { type: 'string' } },
              },
            ],
          },
        },
      },
    });

    const schema =
      model.operations[0]?.operation.requestBody?.content?.['application/json']
        ?.schema;
    const choices = (schema as SchemaObject)?.oneOf as SchemaObject[];
    expect(choices.map((choice) => choice.title)).toEqual([
      'PrepaidModeCardRequest',
      'DebitModeCardRequest',
    ]);
    expect((choices[0]?.allOf?.[1] as SchemaObject)?.required).toEqual([
      'currency',
    ]);
    expect((choices[1]?.allOf?.[1] as SchemaObject)?.required).toEqual([
      'parentManagedAccountId',
    ]);
  });

  it('normalizes Swagger 2 servers, body parameters, responses, and definitions', () => {
    const model = createReferenceModel({
      swagger: '2.0',
      host: 'api.example.com',
      basePath: '/v2',
      schemes: ['https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      paths: {
        '/pets': {
          post: {
            parameters: [
              {
                name: 'pet',
                in: 'body',
                required: true,
                schema: { $ref: '#/definitions/Pet' },
              },
            ],
            responses: {
              '201': {
                description: 'Created',
                schema: { $ref: '#/definitions/Pet' },
              },
            },
          },
        },
      },
      definitions: {
        Pet: { type: 'object', properties: { name: { type: 'string' } } },
      },
    });

    expect(model.document.servers?.[0]?.url).toBe('https://api.example.com/v2');
    expect(
      (
        (model.document.components?.schemas?.Pet as SchemaObject)?.properties
          ?.name as SchemaObject
      )?.type,
    ).toBe('string');
    expect(model.operations[0]?.operation.parameters).toEqual([]);
    const requestSchema = model.operations[0]?.operation.requestBody?.content?.[
      'application/json'
    ]?.schema as SchemaObject;
    const responseSchema = model.operations[0]?.operation.responses?.['201']
      ?.content?.['application/json']?.schema as SchemaObject;
    expect((requestSchema.properties?.name as SchemaObject)?.type).toBe(
      'string',
    );
    expect((responseSchema.properties?.name as SchemaObject)?.type).toBe(
      'string',
    );
  });

  it('collects top-level webhook operations separately from API paths', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {},
      webhooks: {
        paymentReceived: {
          post: { operationId: 'paymentReceived', summary: 'Payment received' },
          get: { operationId: 'inspectPayment', summary: 'Inspect payment' },
        },
        systemReady: {
          post: { operationId: 'systemReady', summary: 'System ready' },
        },
      },
    });

    expect(model.operations).toHaveLength(0);
    expect(
      model.webhooks.map(({ method, path }) => `${method} ${path}`),
    ).toEqual([
      'post paymentReceived',
      'get paymentReceived',
      'post systemReady',
    ]);
  });

  it('adds tagged webhooks to their tag and groups untagged webhooks under Other webhooks', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      paths: {},
      tags: [{ name: 'Payments', description: 'Payment events.' }],
      webhooks: {
        paymentReceived: {
          post: { tags: ['Payments'], summary: 'Payment received' },
        },
        systemReady: { post: { summary: 'System ready' } },
      },
    });

    expect(model.tags).toMatchObject([
      {
        name: 'Payments',
        operations: [{ source: 'webhook', path: 'paymentReceived' }],
      },
      {
        name: 'Other webhooks',
        operations: [{ source: 'webhook', path: 'systemReady' }],
      },
    ]);
    expect(model.webhooks).toHaveLength(2);
  });
});

describe('slugify', () => {
  it('creates anchor-safe IDs', () => {
    expect(slugify('GET /pets/{petId}')).toBe('get-pets-petid');
  });
});
