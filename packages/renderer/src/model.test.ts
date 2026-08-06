import { describe, expect, it } from 'vitest';
import { createReferenceModel, parseSpec, slugify } from './model';

describe('parseSpec', () => {
  it('parses YAML and JSON input', () => {
    expect(parseSpec('openapi: 3.1.0\ninfo:\n  title: Test').info?.title).toBe('Test');
    expect(parseSpec('{"openapi":"3.0.0"}').openapi).toBe('3.0.0');
  });

  it('rejects scalar documents', () => {
    expect(() => parseSpec('hello')).toThrow('must be an object');
  });
});

describe('createReferenceModel', () => {
  it('groups operations by tag and gives duplicate IDs a stable suffix', () => {
    const model = createReferenceModel({
      openapi: '3.1.0',
      tags: [{ name: 'Pets', description: 'Pet things' }],
      paths: {
        '/pets': {
          get: { tags: ['Pets'], operationId: 'listPets' },
          post: { tags: ['Pets'], operationId: 'listPets' },
        },
      },
    });

    expect(model.tags[0]?.name).toBe('Pets');
    expect(model.tags[0]?.description).toBe('Pet things');
    expect(model.operations.map(({ id }) => id)).toEqual(['listpets', 'listpets-2']);
  });

  it('rejects documents without an OpenAPI version', () => {
    expect(() => createReferenceModel({ paths: {} })).toThrow('openapi or swagger');
  });
});

describe('slugify', () => {
  it('creates anchor-safe IDs', () => {
    expect(slugify('GET /pets/{petId}')).toBe('get-pets-petid');
  });
});

