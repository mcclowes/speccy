/**
 * ---
 * purpose: Supplies the two library API versions the diff showcase compares.
 * related:
 *   - ./DiffExample.tsx - Diffs these documents and renders the result.
 * ---
 */

import type { OpenAPIDocument } from 'speccy-core';

const bookSchema = {
  type: 'object',
  required: ['id', 'title'],
  properties: { id: { type: 'string' }, title: { type: 'string' }, availability: { type: 'string', enum: ['available', 'loaned'] } },
};

const loanStatus = (values: string[]) => ({ type: 'string', enum: values });

function library(version: string, overrides: (document: OpenAPIDocument) => void): OpenAPIDocument {
  const document: OpenAPIDocument = {
    openapi: '3.1.0',
    info: { title: 'Luma Library API', version },
    tags: [{ name: 'Books' }, { name: 'Loans' }, { name: 'Members' }],
    paths: {
      '/books': {
        get: {
          operationId: 'list-books', tags: ['Books'], summary: 'List books',
          responses: { '200': { description: 'Books', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Book' } } } } } },
        },
      },
      '/books/{bookId}': {
        parameters: [{ name: 'bookId', in: 'path', required: true, schema: { type: 'string' } }],
        get: { operationId: 'get-book', tags: ['Books'], summary: 'Get a book', responses: { '200': { description: 'Book', content: { 'application/json': { schema: { $ref: '#/components/schemas/Book' } } } } } },
        delete: { operationId: 'remove-book', tags: ['Books'], summary: 'Delete a book', responses: { '204': { description: 'Book deleted' } } },
      },
      '/loans': {
        get: {
          operationId: 'list-loans', tags: ['Loans'], summary: 'List loans', description: 'Returns every loan.',
          responses: { '200': { description: 'Loans', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Loan' } } } } } },
        },
        post: {
          operationId: 'create-loan', tags: ['Loans'], summary: 'Create a loan',
          requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['bookId', 'memberId'], properties: { bookId: { type: 'string' }, memberId: { type: 'string' }, libraryId: { type: 'string' } } } } } },
          responses: { '201': { description: 'Loan created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Loan' } } } } },
        },
      },
      '/members/{memberId}': {
        parameters: [{ name: 'memberId', in: 'path', required: true, schema: { type: 'string' } }],
        get: { operationId: 'get-member', tags: ['Members'], summary: 'Get a member', responses: { '200': { description: 'Member', content: { 'application/json': { schema: { $ref: '#/components/schemas/Member' } } } } } },
      },
      '/members/search': {
        get: { operationId: 'search-members', tags: ['Members'], summary: 'Search members', responses: { '200': { description: 'Members', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Member' } } } } } } },
      },
    },
    components: {
      securitySchemes: { apiKey: { type: 'apiKey', name: 'X-Api-Key', in: 'header' } },
      schemas: {
        Book: structuredClone(bookSchema),
        Loan: { type: 'object', required: ['id', 'status'], properties: { id: { type: 'string' }, status: loanStatus(['active', 'overdue', 'returned']), dueAt: { type: 'string', format: 'date-time' } } },
        Member: { type: 'object', required: ['id'], properties: { id: { type: 'string' }, name: { type: 'string' } } },
      },
    },
  };
  overrides(document);
  return document;
}

export const LIBRARY_V1 = library('1.4.0', () => undefined);

export const LIBRARY_V2 = library('2.0.0', (document) => {
  // Breaking: the delete operation is gone, the loan library becomes mandatory, and reads now need a key.
  delete document.paths!['/books/{bookId}']!.delete;
  document.paths!['/loans']!.post!.requestBody!.content!['application/json']!.schema!.required = ['bookId', 'memberId', 'libraryId'];
  document.paths!['/loans']!.get!.security = [{ apiKey: [] }];

  // Warning: a newly deprecated operation, and a loan status clients have never handled.
  document.paths!['/members/search']!.get!.deprecated = true;
  document.components!.schemas!.Loan!.properties!.status = loanStatus(['active', 'overdue', 'returned', 'pending_review']);

  // Compatible: a new filter, a new operation, and a new optional member field.
  document.paths!['/books']!.get!.parameters = [{ name: 'availability', in: 'query', schema: { type: 'string', enum: ['available', 'loaned'] } }];
  document.paths!['/loans/{loanId}/renew'] = {
    parameters: [{ name: 'loanId', in: 'path', required: true, schema: { type: 'string' } }],
    post: { operationId: 'renew-loan', tags: ['Loans'], summary: 'Renew a loan', responses: { '200': { description: 'Loan renewed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Loan' } } } } } },
  };
  document.components!.schemas!.Member!.properties!.avatarUrl = { type: 'string', format: 'uri' };

  // Documentation: the same behavior, described more precisely.
  document.paths!['/loans']!.get!.description = 'Returns every loan, newest first, in the lending library’s local time zone.';
});
