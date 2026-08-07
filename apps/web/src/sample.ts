import type { OpenAPIDocument } from '@speccy/renderer';

export const SAMPLE_SPEC: OpenAPIDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Luma Library API',
    version: '2026-08-01',
    description: 'A small API for finding books, keeping reading lists, and syncing your place across devices.',
  },
  servers: [{ url: 'https://api.luma.example/v1', description: 'Production' }],
  tags: [
    { name: 'Books', description: 'Search the catalog and inspect individual editions.' },
    { name: 'Reading lists', description: 'Build personal collections that stay in sync.' },
  ],
  paths: {
    '/books': {
      get: {
        tags: ['Books'], operationId: 'listBooks', summary: 'List books',
        description: 'Returns a cursor-paginated list of books. Results can be narrowed by title, author, or ISBN.',
        parameters: [
          { name: 'catalog', in: 'query', required: true, description: 'Catalog to search.', schema: { type: 'string', example: 'public' } },
          { name: 'query', in: 'query', description: 'A title, author, or ISBN fragment.', schema: { type: 'string', example: 'Ursula Le Guin' } },
          { name: 'limit', in: 'query', description: 'The maximum number of books to return.', schema: { type: 'integer', default: 20 } },
          { name: 'cursor', in: 'query', description: 'Continue from a cursor returned by the previous page.', schema: { type: 'string' } },
          { name: 'orderBy', in: 'query', description: 'Field used to order matching books.', schema: { type: 'string', enum: ['title', 'author', 'publishedAt'] } },
          { name: 'include', in: 'query', description: 'Include related records in the response.', schema: { type: 'string', example: 'editions' } },
        ],
        responses: {
          '200': { description: 'A page of books.', content: { 'application/json': { schema: { type: 'object', required: ['data'], properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Book' } }, nextCursor: { type: 'string', nullable: true } } } } } },
          '429': { description: 'Too many requests.' },
        },
      },
      post: {
        tags: ['Books'], operationId: 'createBook', summary: 'Add a book',
        description: 'Adds a new edition to the catalog.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title', 'author'], properties: { title: { type: 'string' }, author: { type: 'string' }, isbn: { type: 'string' }, publishedAt: { type: 'string', format: 'date' } } } } } },
        responses: { '201': { description: 'The book was added.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } } }, '422': { description: 'The book could not be validated.' } },
      },
    },
    '/books/{bookId}': {
      get: {
        tags: ['Books'], operationId: 'getBook', summary: 'Get a book',
        parameters: [{ name: 'bookId', in: 'path', required: true, description: 'The book’s stable identifier.', schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'The requested book.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } } }, '404': { description: 'No book has this identifier.' } },
      },
      delete: {
        tags: ['Books'], operationId: 'deleteBook', summary: 'Remove a book',
        parameters: [{ name: 'bookId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '204': { description: 'The book was removed.' } },
      },
    },
    '/reading-lists': {
      get: {
        tags: ['Reading lists'], operationId: 'listReadingLists', summary: 'List reading lists',
        responses: { '200': { description: 'The current user’s reading lists.', content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, bookCount: { type: 'integer' } } } } } } } },
      },
      post: {
        tags: ['Reading lists'], operationId: 'createReadingList', summary: 'Create a reading list',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', example: 'Quiet science fiction' }, visibility: { type: 'string', enum: ['private', 'shared', 'public'], default: 'private' } } } } } },
        responses: { '201': { description: 'The reading list was created.' } },
      },
    },
  },
  components: {
    schemas: {
      Book: { type: 'object', required: ['id', 'title', 'author'], properties: { id: { type: 'string', format: 'uuid', readOnly: true }, title: { type: 'string' }, author: { type: 'string' }, isbn: { type: 'string' }, publishedAt: { type: 'string', format: 'date' } } },
    },
  },
};
