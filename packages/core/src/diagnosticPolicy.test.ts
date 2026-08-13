import { describe, expect, it } from 'vitest';
import { analyzeOpenApi } from './diagnostics';
import type { OpenAPIDocument } from './types';

const document: OpenAPIDocument = {
  openapi: '3.1.0',
  info: { title: 'Policy API', version: '1' },
  paths: {
    '/internal/jobs': {
      get: {
        summary: 'List jobs',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/customers': {
      get: {
        summary: 'List customers',
        responses: { '200': { description: 'OK' } },
      },
    },
  },
};

describe('diagnostic policy', () => {
  it('overrides severity and ignores matching API paths', () => {
    const diagnostics = analyzeOpenApi(document, {
      policy: {
        rules: { 'operation-description': 'warning' },
        ignore: [
          {
            rules: ['operation-description'],
            paths: ['/internal/**'],
          },
        ],
      },
    }).filter((item) => item.ruleId === 'operation-description');

    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: 'warning',
        path: ['paths', '/customers', 'get', 'description'],
      }),
    ]);
  });

  it('reports expired new lifecycle metadata after the configured age', () => {
    const lifecycleDocument: OpenAPIDocument = {
      ...document,
      paths: {
        '/customers': {
          post: {
            operationId: 'createCustomer',
            'x-speccy-lifecycle': 'new',
            'x-speccy-lifecycle-since': '2026-01-01',
          },
        },
      },
    };

    const diagnostics = analyzeOpenApi(lifecycleDocument, {
      now: new Date('2026-02-20T00:00:00Z'),
      policy: {
        rules: { 'new-operation-lifecycle': { maxAgeDays: 45 } },
      },
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'new-operation-lifecycle-expired',
          message: expect.stringContaining('50 days'),
        }),
      ]),
    );
  });
});
