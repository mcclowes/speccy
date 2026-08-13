import { describe, expect, it } from 'vitest';
import { createApiHealthJobs } from './apiHealthIndex';

const document = {
  openapi: '3.1.0',
  info: { title: 'Catalog', version: '1' },
  paths: {
    '/one': {
      get: {
        operationId: 'getOne',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Result' },
              },
            },
          },
        },
      },
    },
    '/two': { get: { operationId: 'getTwo', responses: {} } },
  },
  components: {
    schemas: {
      Result: { type: 'object', properties: { id: { type: 'string' } } },
    },
  },
};

describe('createApiHealthJobs', () => {
  it('prioritizes the current operation and carries its referenced schemas', () => {
    const jobs = createApiHealthJobs(document, {
      page: 'operation',
      operationId: 'getone',
    });

    expect(jobs[0]?.currentPage).toBe(true);
    expect(jobs[0]?.document().paths).toHaveProperty('/one');
    expect(jobs.at(-1)?.currentPage).toBe(false);
  });

  it('checks overview metadata before path batches on the overview', () => {
    const jobs = createApiHealthJobs(document, { page: 'overview' });

    expect(jobs[0]).toMatchObject({ id: 'overview', currentPage: true });
    expect(jobs[0]?.document().paths).toEqual({});
  });
});
