import { describe, expect, it } from 'vitest';
import { createReferenceModel } from 'speccy-renderer';
import { SAMPLE_SPEC } from './sample';

describe('sample spec', () => {
  it('renders every sample operation in its declared tag', () => {
    const model = createReferenceModel(SAMPLE_SPEC);

    expect(model.operations).toHaveLength(6);
    expect(model.tags.map(({ name }) => name)).toEqual([
      'Books',
      'Reading lists',
    ]);
  });

  it('demonstrates prerequisite and response-link workflows', () => {
    const createBook = SAMPLE_SPEC.paths?.['/books']?.post;

    expect(createBook?.['x-speccy-prerequisites']).toEqual([
      expect.objectContaining({ operationId: 'listBooks' }),
    ]);
    expect(createBook?.responses?.['201']?.links?.getCreatedBook).toEqual(
      expect.objectContaining({
        operationId: 'getBook',
        parameters: { bookId: '$response.body#/id' },
      }),
    );
  });
});
