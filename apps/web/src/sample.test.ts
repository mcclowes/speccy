import { describe, expect, it } from 'vitest';
import { createReferenceModel } from 'speccy-renderer';
import { SAMPLE_SPEC } from './sample';

describe('sample spec', () => {
  it('renders every sample operation in its declared tag', () => {
    const model = createReferenceModel(SAMPLE_SPEC);

    expect(model.operations).toHaveLength(7);
    expect(model.tags.map(({ name }) => name)).toEqual([
      'Books',
      'Reading lists',
      'Accounts',
    ]);
  });

  it('demonstrates conditional JSON Schema validation', () => {
    const schema =
      SAMPLE_SPEC.paths?.['/accounts']?.post?.requestBody?.content?.[
        'application/json'
      ]?.schema;

    expect(schema).toEqual(
      expect.objectContaining({
        if: expect.objectContaining({
          properties: { accountType: { const: 'business' } },
        }),
        then: { required: ['companyName'] },
        else: { properties: { companyName: false } },
        unevaluatedProperties: false,
      }),
    );
  });

  it('demonstrates prerequisite, response-link, and callback workflows', () => {
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
    expect(
      createBook?.callbacks?.catalogIndexing?.[
        '{$request.body#/statusCallbackUrl}'
      ]?.post,
    ).toEqual(
      expect.objectContaining({
        summary: 'Report catalog indexing result',
        security: [{ callbackSignature: [] }],
      }),
    );
    expect(createBook?.['x-speccy-webhooks']).toEqual([
      expect.objectContaining({ operationId: 'bookIndexed' }),
    ]);
  });

  it('demonstrates an account-level webhook event', () => {
    const webhook = SAMPLE_SPEC.webhooks?.['book.indexed']?.post;

    expect(webhook).toEqual(
      expect.objectContaining({
        operationId: 'bookIndexed',
        security: [{ callbackSignature: [] }],
      }),
    );
    expect(webhook?.requestBody?.content?.['application/json']?.schema).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          event: { type: 'string', const: 'book.indexed' },
        }),
      }),
    );
  });

  it('demonstrates request availability and authorization', () => {
    expect(SAMPLE_SPEC.servers).toHaveLength(2);
    expect(SAMPLE_SPEC.security).toEqual([{ apiKey: [] }]);
    expect(SAMPLE_SPEC.paths?.['/books']?.get?.security).toEqual([
      { oauth: ['books:read'] },
      { apiKey: [] },
    ]);
    expect(SAMPLE_SPEC.components?.securitySchemes?.oauth).toEqual(
      expect.objectContaining({ type: 'oauth2' }),
    );
    expect(SAMPLE_SPEC.components?.securitySchemes?.apiKey).toEqual(
      expect.objectContaining({ type: 'apiKey', in: 'header' }),
    );
    expect(SAMPLE_SPEC.components?.securitySchemes?.callbackSignature).toEqual(
      expect.objectContaining({
        type: 'apiKey',
        in: 'header',
        name: 'X-Luma-Signature',
      }),
    );
  });

  it('provides examples for reusable schema fields', () => {
    const book = SAMPLE_SPEC.components?.schemas?.Book;

    expect(book).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          title: expect.objectContaining({
            examples: ['The Left Hand of Darkness', 'Kindred'],
          }),
          author: expect.objectContaining({
            examples: ['Ursula K. Le Guin', 'Octavia E. Butler'],
          }),
        }),
      }),
    );
  });
});
