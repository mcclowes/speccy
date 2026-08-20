import { describe, expect, it } from 'vitest';
import { stripNonMaterialFields } from './materialDiff';

describe('stripNonMaterialFields', () => {
  it('omits descriptions and extension properties at every depth', () => {
    const result = stripNonMaterialFields({
      openapi: '3.1.0',
      info: {
        title: 'Lending',
        version: '1.0.0',
        description: 'Editorial copy',
        'x-icon': { url: 'https://example.test/logo.svg' },
      },
      paths: {
        '/loans': {
          get: {
            summary: 'List loans',
            description: 'Editorial copy',
            'x-speccy-lifecycle': 'beta',
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      description: 'A loan',
                      'x-codegen-name': 'Loan',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(result).toEqual({
      openapi: '3.1.0',
      info: { title: 'Lending', version: '1.0.0' },
      paths: {
        '/loans': {
          get: {
            summary: 'List loans',
            responses: {
              '200': {
                content: {
                  'application/json': { schema: { type: 'object' } },
                },
              },
            },
          },
        },
      },
    });
  });
});
