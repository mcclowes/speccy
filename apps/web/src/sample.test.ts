import { describe, expect, it } from 'vitest';
import { createReferenceModel } from '@speccy/renderer';
import { SAMPLE_SPEC } from './sample';

describe('sample spec', () => {
  it('renders every sample operation in its declared tag', () => {
    const model = createReferenceModel(SAMPLE_SPEC);

    expect(model.operations).toHaveLength(6);
    expect(model.tags.map(({ name }) => name)).toEqual(['Books', 'Reading lists']);
  });
});
