/**
 * ---
 * purpose: Sample Luma Library OpenAPI document shown as the studio's first-run preview.
 * related:
 *   - ./App.tsx - Loads this document when no reference is open.
 * ---
 */

import type { OpenAPIDocument } from 'speccy-renderer';

export const SAMPLE_SPEC: OpenAPIDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Luma Library API',
    version: '2026-08-01',
    description:
      'A small API for finding books, keeping reading lists, and syncing your place across devices.',
  },
  servers: [
    { url: 'https://sandbox.luma.example/v1', description: 'Sandbox' },
    { url: 'https://api.luma.example/v1', description: 'Production' },
  ],
  security: [{ apiKey: [] }],
  tags: [
    {
      name: 'Books',
      description: 'Search the catalog and inspect individual editions.',
    },
    {
      name: 'Reading lists',
      description: 'Build personal collections that stay in sync.',
    },
    {
      name: 'Accounts',
      description: 'Register personal and business library accounts.',
    },
  ],
  paths: {
    '/books': {
      get: {
        tags: ['Books'],
        operationId: 'listBooks',
        summary: 'List books',
        description:
          'Returns a cursor-paginated list of books. Results can be narrowed by title, author, or ISBN.',
        security: [{ oauth: ['books:read'] }, { apiKey: [] }],
        parameters: [
          {
            name: 'catalog',
            in: 'query',
            required: true,
            description: 'Catalog to search.',
            schema: { type: 'string', example: 'public' },
          },
          {
            name: 'query',
            in: 'query',
            description: 'A title, author, or ISBN fragment.',
            schema: { type: 'string', example: 'Ursula Le Guin' },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'The maximum number of books to return.',
            schema: { type: 'integer', default: 20 },
          },
          {
            name: 'cursor',
            in: 'query',
            description:
              'Continue from a cursor returned by the previous page.',
            schema: { type: 'string' },
          },
          {
            name: 'orderBy',
            in: 'query',
            description: 'Field used to order matching books.',
            schema: {
              type: 'string',
              enum: ['title', 'author', 'publishedAt'],
            },
          },
          {
            name: 'include',
            in: 'query',
            description: 'Include related records in the response.',
            schema: { type: 'string', example: 'editions' },
          },
        ],
        responses: {
          '200': {
            description: 'A page of books.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Book' },
                    },
                    nextCursor: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          '429': { description: 'Too many requests.' },
        },
      },
      post: {
        tags: ['Books'],
        operationId: 'createBook',
        summary: 'Add a book',
        description: 'Adds a new edition to the catalog.',
        'x-speccy-webhooks': [
          {
            operationId: 'bookIndexed',
            description: 'Emitted after catalog indexing finishes.',
          },
        ],
        'x-speccy-prerequisites': [
          {
            operationId: 'listBooks',
            description:
              'Search the catalog first to avoid adding a duplicate edition.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'author'],
                properties: {
                  title: { type: 'string' },
                  author: { type: 'string' },
                  isbn: { type: 'string' },
                  publishedAt: { type: 'string', format: 'date' },
                  statusCallbackUrl: {
                    type: 'string',
                    format: 'uri',
                    description:
                      'Receives the result when catalog indexing finishes.',
                  },
                },
              },
            },
          },
        },
        callbacks: {
          catalogIndexing: {
            '{$request.body#/statusCallbackUrl}': {
              post: {
                summary: 'Report catalog indexing result',
                description:
                  'Reports whether the new edition was added to the search index.',
                security: [{ callbackSignature: [] }],
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['bookId', 'status'],
                        properties: {
                          bookId: { type: 'string', format: 'uuid' },
                          status: {
                            type: 'string',
                            enum: ['indexed', 'rejected'],
                          },
                        },
                      },
                    },
                  },
                },
                responses: {
                  '204': { description: 'The indexing result was received.' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'The book was added.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Book' },
              },
            },
            links: {
              getCreatedBook: {
                operationId: 'getBook',
                description: 'Retrieve the book that was just added.',
                parameters: {
                  bookId: '$response.body#/id',
                },
              },
            },
          },
          '422': { description: 'The book could not be validated.' },
        },
      },
    },
    '/books/{bookId}': {
      get: {
        tags: ['Books'],
        operationId: 'getBook',
        summary: 'Get a book',
        parameters: [
          {
            name: 'bookId',
            in: 'path',
            required: true,
            description: 'The book’s stable identifier.',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'The requested book.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Book' },
              },
            },
          },
          '404': { description: 'No book has this identifier.' },
        },
      },
      delete: {
        tags: ['Books'],
        operationId: 'deleteBook',
        summary: 'Remove a book',
        parameters: [
          {
            name: 'bookId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: { '204': { description: 'The book was removed.' } },
      },
    },
    '/reading-lists': {
      get: {
        tags: ['Reading lists'],
        operationId: 'listReadingLists',
        summary: 'List reading lists',
        responses: {
          '200': {
            description: 'The current user’s reading lists.',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' },
                      bookCount: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Reading lists'],
        operationId: 'createReadingList',
        summary: 'Create a reading list',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Quiet science fiction' },
                  visibility: {
                    type: 'string',
                    enum: ['private', 'shared', 'public'],
                    default: 'private',
                  },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'The reading list was created.' } },
      },
    },
    '/accounts': {
      post: {
        tags: ['Accounts'],
        operationId: 'createAccount',
        summary: 'Create an account',
        description:
          'Registers a personal or business account. Business accounts must include a company name.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'accountType'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  accountType: {
                    type: 'string',
                    enum: ['personal', 'business'],
                  },
                  companyName: {
                    type: 'string',
                    description: 'Required when accountType is business.',
                  },
                },
                if: {
                  properties: {
                    accountType: { const: 'business' },
                  },
                  required: ['accountType'],
                },
                then: { required: ['companyName'] },
                else: {
                  properties: {
                    companyName: false,
                  },
                },
                unevaluatedProperties: false,
              },
            },
          },
        },
        responses: {
          '201': { description: 'The account was created.' },
          '422': {
            description: 'The account does not satisfy its conditional schema.',
          },
        },
      },
    },
  },
  webhooks: {
    'book.indexed': {
      post: {
        tags: ['Books'],
        operationId: 'bookIndexed',
        summary: 'Book indexed',
        description:
          'Sent to registered webhook subscriptions after a book becomes searchable in the catalog.',
        security: [{ callbackSignature: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['event', 'book'],
                properties: {
                  event: { type: 'string', const: 'book.indexed' },
                  book: { $ref: '#/components/schemas/Book' },
                },
              },
            },
          },
        },
        responses: {
          '204': { description: 'The event was received.' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      oauth: {
        type: 'oauth2',
        description: 'OAuth for signed-in Luma members and applications.',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://auth.luma.example/authorize',
            tokenUrl: 'https://auth.luma.example/token',
            scopes: {
              'books:read': 'Read books from the Luma catalog.',
            },
          },
        },
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'Your Luma API key.',
      },
      callbackSignature: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Luma-Signature',
        description:
          'An HMAC signature used to verify that Luma sent the callback.',
      },
    },
    schemas: {
      Book: {
        type: 'object',
        required: ['id', 'title', 'author'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            readOnly: true,
            examples: ['6ba7b810-9dad-11d1-80b4-00c04fd430c8'],
          },
          title: {
            type: 'string',
            examples: ['The Left Hand of Darkness', 'Kindred'],
          },
          author: {
            type: 'string',
            examples: ['Ursula K. Le Guin', 'Octavia E. Butler'],
          },
          isbn: { type: 'string', examples: ['9780441478125'] },
          publishedAt: {
            type: 'string',
            format: 'date',
            examples: ['1969-03-01'],
          },
        },
      },
    },
  },
};
