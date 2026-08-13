import { describe, expect, it, vi } from 'vitest';
import { resolveExternalRefs } from './externalRefs';

describe('resolveExternalRefs', () => {
  it('preserves local references in the entry document', async () => {
    const load = vi.fn(
      async () => `
openapi: 3.1.1
info: { title: Local references, version: 1.0.0 }
paths: {}
components:
  schemas:
    Pet: { type: object }
    PetList: { type: array, items: { $ref: '#/components/schemas/Pet' } }
`,
    );

    const result = await resolveExternalRefs(
      'https://example.com/openapi.yaml',
      load,
    );

    expect(result.components?.schemas?.PetList).toMatchObject({
      items: { $ref: '#/components/schemas/Pet' },
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('resolves relative documents, JSON Pointers, anchors, and reference siblings', async () => {
    const load = vi.fn(async (uri: string) => {
      const documents: Record<string, string> = {
        'https://example.com/openapi.yaml': `
openapi: 3.1.1
info: { title: Multi-document API, version: 1.0.0 }
paths:
  /pets:
    $ref: './paths.yaml#/$defs/Pets'
components:
  schemas:
    Pet:
      $ref: './schemas.yaml#Pet'
      description: A local description
`,
        'https://example.com/paths.yaml': `
$defs:
  Pets:
    get:
      operationId: listPets
      responses: { '200': { description: Pets } }
`,
        'https://example.com/schemas.yaml': `
$id: schemas.yaml
$defs:
  Pet:
    $anchor: Pet
    type: object
    properties:
      name: { type: string }
`,
      };
      return documents[uri]!;
    });

    const result = await resolveExternalRefs(
      'https://example.com/openapi.yaml',
      load,
    );

    expect(result.paths?.['/pets']?.get?.operationId).toBe('listPets');
    expect(result.components?.schemas?.Pet).toMatchObject({
      description: 'A local description',
      type: 'object',
      properties: { name: { type: 'string' } },
    });
    expect(load).toHaveBeenCalledTimes(3);
  });
});
