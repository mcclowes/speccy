import { describe, expect, it } from 'vitest';
import { createReferenceModel } from './model';
import { bundleFragmentedSpec } from './fragmentedSpec';
import type { SchemaObject } from './types';

describe('bundleFragmentedSpec', () => {
  it('resolves refs relative to the document that declares them', () => {
    const document = bundleFragmentedSpec(
      {
        'reference/api.yml': `
openapi: 3.1.0
info: { title: Fragmented API }
paths:
  /widgets:
    get:
      operationId: listWidgets
      responses:
        '200':
          $ref: './shared/responses.yml#/components/responses/Widgets'
`,
        'reference/shared/responses.yml': `
components:
  responses:
    Widgets:
      $ref: '#/components/responses/WidgetPage'
    WidgetPage:
      description: Found them
      content:
        application/json:
          schema:
            $ref: '../schemas.yml#/components/schemas/WidgetList'
`,
        'reference/schemas.yml': `
components:
  schemas:
    WidgetList:
      type: array
      items: { type: string }
`,
      },
      'reference/api.yml',
    );

    const model = createReferenceModel(document);
    const response = model.operations[0]?.operation.responses?.['200'];
    expect(response?.description).toBe('Found them');
    expect(
      (response?.content?.['application/json']?.schema as SchemaObject)?.type,
    ).toBe('array');
  });

  it('leaves remote and missing refs unchanged', () => {
    const document = bundleFragmentedSpec(
      {
        'api.yml':
          'openapi: 3.1.0\ninfo: { title: API }\nexternal: { $ref: "https://example.com/common.yml#/Thing" }\nmissing: { $ref: "nope.yml#/Thing" }',
      },
      'api.yml',
    ) as Record<string, unknown>;

    expect(document.external).toEqual({
      $ref: 'https://example.com/common.yml#/Thing',
    });
    expect(document.missing).toEqual({ $ref: 'nope.yml#/Thing' });
  });
});
