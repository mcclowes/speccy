import { describe, expect, it } from 'vitest';
import { runSpectral } from './spectral';

describe('runSpectral', () => {
  it('runs the standard OAS ruleset against source text', async () => {
    const diagnostics = await runSpectral('openapi: 3.1.0\ninfo:\n  title: Bare API\n  version: "1"\npaths: {}');

    expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'info-description' })]));
  });
});
