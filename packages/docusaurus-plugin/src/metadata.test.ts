import { describe, expect, it } from 'vitest';
import { referenceMetadata } from './metadata';

const spec = {
  openapi: '3.1.0',
  info: { title: 'Payments API', description: 'Move money.' },
  tags: [{ name: 'Credit cards', description: 'Manage cards.' }],
  paths: {
    '/cards': {
      get: {
        operationId: 'listCards',
        summary: 'List cards',
        description: 'Returns every card.',
        tags: ['Credit cards'],
      },
    },
  },
  components: { requestBodies: { Card: { description: 'A card.' } } },
};

describe('referenceMetadata', () => {
  it('describes the reference overview', () => {
    expect(referenceMetadata(spec)).toEqual({
      title: 'Payments API reference',
      description: 'Move money.',
    });
  });

  it('uses operation metadata on operation routes', () => {
    expect(
      referenceMetadata(spec, {
        page: 'operation',
        operationId: 'listcards',
      }),
    ).toEqual({
      title: 'List cards | Payments API',
      description: 'Returns every card.',
    });
  });

  it('uses tag metadata on tag routes', () => {
    expect(
      referenceMetadata(spec, { page: 'tag', tag: 'credit-cards' }),
    ).toEqual({
      title: 'Credit cards | Payments API',
      description: 'Manage cards.',
    });
  });

  it('describes reusable component sections', () => {
    expect(
      referenceMetadata(spec, {
        page: 'reference',
        section: 'requestBodies',
      }),
    ).toEqual({
      title: 'Request bodies | Payments API',
      description: 'Reusable request bodies for Payments API.',
    });
  });
});
