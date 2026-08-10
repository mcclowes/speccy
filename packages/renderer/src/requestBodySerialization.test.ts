import { describe, expect, it } from 'vitest';
import { serializeRequestBody } from './requestBodySerialization';

describe('OpenAPI request body serialization', () => {
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
