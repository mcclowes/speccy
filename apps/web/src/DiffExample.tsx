/**
 * ---
 * purpose: Provides the web studio's realistic, interactive semantic OpenAPI diff showcase.
 * related:
 *   - speccy-renderer - Renders the normalized example report through the public package API.
 *   - ./main.tsx - Selects this showcase for the /diff route.
 * ---
 */

import { SpecDiff, type DiffReport } from 'speccy-renderer';

const EXAMPLE_REPORT: DiffReport = {
  base: { title: 'Luma Library API', version: '1.4.0' },
  revision: { title: 'Luma Library API', version: '2.0.0' },
  changes: [
    {
      id: 'remove-book',
      severity: 'breaking',
      kind: 'removed',
      method: 'delete',
      path: '/books/{bookId}',
      operationId: 'remove-book',
      tag: 'Books',
      scope: { area: 'operation' },
      location: ['paths', '/books/{bookId}', 'delete'],
      message: 'Removed the operation for permanently deleting a book.',
      before: { operationId: 'removeBook', responses: { 204: { description: 'Book deleted' } } },
    },
    {
      id: 'require-library-id',
      severity: 'breaking',
      kind: 'changed',
      method: 'post',
      path: '/loans',
      operationId: 'create-loan',
      tag: 'Loans',
      scope: { area: 'request-body', label: 'application/json · CreateLoan.libraryId' },
      location: ['paths', '/loans', 'post', 'requestBody', 'libraryId'],
      message: 'The libraryId request property is now required.',
      before: { required: ['bookId', 'memberId'] },
      after: { required: ['bookId', 'memberId', 'libraryId'] },
    },
    {
      id: 'narrow-loan-status',
      severity: 'breaking',
      kind: 'changed',
      tag: 'Loans',
      affectedOperations: [
        { method: 'get', path: '/loans/{loanId}', operationId: 'get-loan', tag: 'Loans' },
        { method: 'get', path: '/loans', operationId: 'list-loans', tag: 'Loans' },
      ],
      scope: { area: 'response-body', label: '200 · application/json · Loan.status' },
      location: ['components', 'schemas', 'Loan', 'properties', 'status', 'enum'],
      message: 'Removed pending_review from the returned loan status values.',
      before: ['active', 'overdue', 'returned', 'pending_review'],
      after: ['active', 'overdue', 'returned'],
    },
    {
      id: 'deprecate-member-search',
      severity: 'warning',
      kind: 'deprecated',
      method: 'get',
      path: '/members/search',
      operationId: 'search-members',
      tag: 'Members',
      scope: { area: 'operation', label: 'Deprecation' },
      location: ['paths', '/members/search', 'get', 'deprecated'],
      message: 'Member search is deprecated in favor of GET /members with filters.',
      before: false,
      after: true,
    },
    {
      id: 'add-book-filter',
      severity: 'compatible',
      kind: 'added',
      method: 'get',
      path: '/books',
      operationId: 'list-books',
      tag: 'Books',
      scope: { area: 'parameters', label: 'Query parameter · availability' },
      location: ['paths', '/books', 'get', 'parameters', 'availability'],
      message: 'Added an optional availability query filter.',
      after: { name: 'availability', in: 'query', required: false, schema: { enum: ['available', 'loaned'] } },
    },
    {
      id: 'add-renew-loan',
      severity: 'compatible',
      kind: 'added',
      method: 'post',
      path: '/loans/{loanId}/renew',
      operationId: 'renew-loan',
      tag: 'Loans',
      scope: { area: 'operation' },
      location: ['paths', '/loans/{loanId}/renew', 'post'],
      message: 'Added an operation for renewing an active loan.',
      after: { operationId: 'renewLoan', responses: { 200: { description: 'Loan renewed' } } },
    },
    {
      id: 'add-member-avatar',
      severity: 'compatible',
      kind: 'added',
      method: 'get',
      path: '/members/{memberId}',
      operationId: 'get-member',
      tag: 'Members',
      scope: { area: 'response-body', label: '200 · application/json · Member.avatarUrl' },
      location: ['components', 'schemas', 'Member', 'properties', 'avatarUrl'],
      message: 'Added an optional avatarUrl field to member responses.',
      after: { type: 'string', format: 'uri', nullable: true },
    },
    {
      id: 'clarify-overdue-description',
      severity: 'documentation',
      kind: 'changed',
      tag: 'Loans',
      scope: { area: 'documentation', label: 'Loan.dueAt' },
      location: ['components', 'schemas', 'Loan', 'properties', 'dueAt', 'description'],
      message: 'Clarified how overdue dates are calculated.',
      before: 'The date the book is due.',
      after: 'The date the book is due, calculated in the lending library’s local time zone.',
    },
  ],
};

export function DiffExample() {
  return (
    <SpecDiff
      className="diff-example"
      headingLevel={1}
      report={EXAMPLE_REPORT}
      hrefForChange={(change) => change.operationId ? `/#${change.operationId}` : undefined}
    />
  );
}
