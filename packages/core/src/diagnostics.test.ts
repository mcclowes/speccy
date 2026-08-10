import { describe, expect, it } from 'vitest';
import { adaptSpectralDiagnostics, analyzeOpenApi } from './diagnostics';
import type { OpenAPIDocument } from './types';

const weakSpec: OpenAPIDocument = {
  openapi: '3.1.0',
  info: { title: 'Payments', version: '1' },
  components: {
    securitySchemes: { apiKey: { type: 'apiKey' } },
    schemas: {
      Payment: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          createdAt: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/create/payment/{paymentId}': {
      post: {
        tags: ['Payments'],
        summary: 'Create payment',
        parameters: [{ name: 'paymentId', in: 'path' }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { amount: { type: 'number' } },
              },
            },
          },
        },
        responses: {
          204: {
            description: 'Done',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
      },
    },
  },
};

describe('OpenAPI diagnostics', () => {
  it('finds correctness, documentation, design, auth, error, and modeling problems', () => {
    const rules = new Set(
      analyzeOpenApi(weakSpec).map((diagnostic) => diagnostic.ruleId),
    );

    for (const rule of [
      'api-description',
      'noun-paths',
      'operation-id',
      'operation-description',
      'path-parameter-required',
      'request-example',
      'no-content-body',
      'error-response',
      'operation-security',
      'api-key-location',
      'property-description',
      'timestamp-format',
      'money-precision',
    ]) {
      expect(rules.has(rule), rule).toBe(true);
    }
  });

  it('reports breaking changes against a previous document', () => {
    const current: OpenAPIDocument = {
      openapi: '3.1.0',
      info: { title: 'Payments', version: '2' },
      paths: {},
    };
    const diagnostics = analyzeOpenApi(current, { previousDocument: weakSpec });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'operation-removed',
          severity: 'issue',
        }),
      ]),
    );
  });

  it('adapts every supplied Spectral result without dropping its location', () => {
    const diagnostics = adaptSpectralDiagnostics([
      {
        code: 'operation-operationId',
        message: 'Operation must have an operationId.',
        severity: 0,
        path: ['paths', '/pets', 'get'],
        range: {
          start: { line: 4, character: 2 },
          end: { line: 4, character: 5 },
        },
      },
    ]);

    expect(diagnostics[0]).toMatchObject({
      source: 'spectral',
      ruleId: 'operation-operationId',
      severity: 'issue',
      path: ['paths', '/pets', 'get'],
      range: { start: { line: 4 } },
    });
  });

  it('reports a literal UUID in a path', () => {
    const document: OpenAPIDocument = {
      openapi: '3.1.0',
      info: { title: 'Companies', version: '1' },
      paths: {
        '/companies/8a210b68-6988-11ed-a1eb-0242ac120002/connections': {},
      },
    };

    expect(analyzeOpenApi(document)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'literal-path-identifier',
          severity: 'warning',
          path: [
            'paths',
            '/companies/8a210b68-6988-11ed-a1eb-0242ac120002/connections',
          ],
        }),
      ]),
    );
  });

  it('does not report UUID examples supplied through path parameters', () => {
    const document: OpenAPIDocument = {
      openapi: '3.1.0',
      info: { title: 'Companies', version: '1' },
      paths: {
        '/companies/{companyId}/connections': {
          parameters: [
            {
              name: 'companyId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                format: 'uuid',
                example: '8a210b68-6988-11ed-a1eb-0242ac120002',
              },
            },
          ],
        },
      },
    };

    expect(
      analyzeOpenApi(document).some(
        (diagnostic) => diagnostic.ruleId === 'literal-path-identifier',
      ),
    ).toBe(false);
  });

  it('names missing-description diagnostics for referenced parameters', () => {
    const document: OpenAPIDocument = {
      openapi: '3.1.0',
      info: { title: 'Companies', version: '1' },
      paths: {
        '/companies': {
          get: {
            parameters: [
              { $ref: '#/components/parameters/page' },
              { $ref: '#/components/parameters/pageSize' },
            ],
          },
        },
      },
      components: {
        parameters: {
          page: { name: 'page', in: 'query', schema: { type: 'integer' } },
          pageSize: {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer' },
          },
        },
      },
    };

    const diagnostics = analyzeOpenApi(document).filter(
      (diagnostic) => diagnostic.ruleId === 'parameter-description',
    );

    expect(diagnostics).toEqual([
      expect.objectContaining({
        message: 'page has no description.',
        path: ['paths', '/companies', 'get', 'parameters', 0],
      }),
      expect.objectContaining({
        message: 'pageSize has no description.',
        path: ['paths', '/companies', 'get', 'parameters', 1],
      }),
    ]);
  });
});
