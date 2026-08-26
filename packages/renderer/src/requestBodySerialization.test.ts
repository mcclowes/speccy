import { describe, expect, it } from 'vitest';
import { serializeRequestBody } from './requestBodySerialization';

describe('OpenAPI request body serialization', () => {
  it('preserves reserved characters for URL-encoded properties that allow them', () => {
    expect(
      serializeRequestBody(
        'application/x-www-form-urlencoded',
        {
          schema: { type: 'object' },
          encoding: { callback: { allowReserved: true } },
        },
        '{"callback":"https://client.example/callback?state=ready"}',
      ),
    ).toEqual({
      body: 'callback=https://client.example/callback?state=ready',
      contentType: 'application/x-www-form-urlencoded',
    });
  });

  it('applies allowReserved to every pair from an exploded object property', () => {
    expect(
      serializeRequestBody(
        'application/x-www-form-urlencoded',
        {
          schema: { type: 'object' },
          encoding: {
            filter: { style: 'form', explode: true, allowReserved: true },
          },
        },
        '{"filter":{"next":"https://client.example/next","state":"ready"}}',
      ).body,
    ).toBe('next=https://client.example/next&state=ready');
  });

  it('serializes URL-encoded bodies using property encoding rules', () => {
    expect(
      serializeRequestBody(
        'application/x-www-form-urlencoded',
        {
          schema: { type: 'object' },
          encoding: { tags: { style: 'form', explode: true } },
        },
        '{"tags":["red","blue"],"name":"Ada"}',
      ),
    ).toEqual({
      body: 'tags=red&tags=blue&name=Ada',
      contentType: 'application/x-www-form-urlencoded',
    });
  });

  it('serializes multipart bodies with part content types and headers', () => {
    const result = serializeRequestBody(
      'multipart/form-data',
      {
        schema: { type: 'object' },
        encoding: {
          file: {
            contentType: 'image/png',
            headers: { 'X-Checksum': { example: 'sha256:abc' } },
          },
        },
      },
      '{"file":"binary","title":"Portrait"}',
    );

    expect(result.contentType).toMatch(
      /^multipart\/form-data; boundary=speccy-/,
    );
    expect(result.body).toContain('name="file"');
    expect(result.body).toContain('Content-Type: image/png');
    expect(result.body).toContain('X-Checksum: sha256:abc');
    expect(result.body).toContain('binary');
    expect(result.body).toContain('name="title"');
  });
});
