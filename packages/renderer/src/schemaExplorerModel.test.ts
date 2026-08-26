import { describe, expect, it } from 'vitest';
import { schemaTypeLabel, structuralObjectSchema } from './schemaExplorerModel';

describe('schema explorer model', () => {
  it('preserves scalar constraints inherited through allOf', () => {
    const schema = structuralObjectSchema({
      description: 'An overridden description.',
      allOf: [
        {
          enum: ['NOT_STARTED', 'APPROVED'],
          format: 'status',
          pattern: '^[A-Z_]+$',
          minimum: 1,
          maximum: 10,
          minLength: 2,
          maxLength: 20,
          example: 'APPROVED',
        },
      ],
    });

    expect(schema).toMatchObject({
      enum: ['NOT_STARTED', 'APPROVED'],
      format: 'status',
      pattern: '^[A-Z_]+$',
      minimum: 1,
      maximum: 10,
      minLength: 2,
      maxLength: 20,
      example: 'APPROVED',
    });
  });

  it('labels an enum inherited through allOf as an enum', () => {
    expect(
      schemaTypeLabel({
        description: 'An overridden description.',
        allOf: [{ enum: ['NOT_STARTED', 'APPROVED'] }],
      }),
    ).toBe('enum');
  });

  it('keeps constraints declared directly on the wrapper', () => {
    const schema = structuralObjectSchema({
      enum: ['LOCAL'],
      minLength: 5,
      allOf: [{ enum: ['INHERITED'], minLength: 2 }],
    });

    expect(schema.enum).toEqual(['LOCAL']);
    expect(schema.minLength).toBe(5);
  });

  it('preserves constraints through nested allOf wrappers', () => {
    const schema = structuralObjectSchema({
      allOf: [{ allOf: [{ pattern: '^[A-Z]+$', maxLength: 3 }] }],
    });

    expect(schema.pattern).toBe('^[A-Z]+$');
    expect(schema.maxLength).toBe(3);
  });
});
