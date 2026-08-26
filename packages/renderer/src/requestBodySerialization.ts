/**
 * ---
 * purpose: Converts request-builder JSON into OpenAPI URL-encoded and multipart wire bodies.
 * related:
 *   - ./OperationDetails.tsx - Sends and previews the serialized request body.
 *   - ./parameterSerialization.ts - Applies Encoding Object style and explode rules.
 * ---
 */

import type { MediaType } from 'speccy-core';
import { serializeParameter } from './parameterSerialization';

export interface SerializedRequestBody {
  body: string;
  contentType: string;
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function scalar(value: unknown): string {
  return value !== null && typeof value === 'object'
    ? JSON.stringify(value)
    : String(value ?? '');
}

function encodeFormValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) return encoded;
  return encoded.replace(
    /%3A|%2F|%3F|%23|%5B|%5D|%40|%21|%24|%26|%27|%28|%29|%2A|%2B|%2C|%3B|%3D/gi,
    (part) => decodeURIComponent(part),
  );
}

export function serializeRequestBody(
  mediaType: string,
  media: MediaType,
  body: string,
): SerializedRequestBody {
  const value = parseBody(body);
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (mediaType !== 'application/x-www-form-urlencoded' &&
      mediaType !== 'multipart/form-data')
  ) {
    return { body, contentType: mediaType };
  }

  const fields = Object.entries(value);
  if (mediaType === 'application/x-www-form-urlencoded') {
    const pairs = fields.reduce<Array<[string, string, boolean]>>(
      (result, [name, fieldValue]) => {
        const encoding = media.encoding?.[name];
        const serialized = serializeParameter(
          {
            name,
            in: 'query',
            style: encoding?.style ?? 'form',
            explode: encoding?.explode,
          },
          fieldValue,
        );
        result.push(
          ...(Array.isArray(serialized)
            ? serialized.map(
                ([pairName, item]) =>
                  [pairName, item, encoding?.allowReserved === true] satisfies [
                    string,
                    string,
                    boolean,
                  ],
              )
            : [
                [name, serialized, encoding?.allowReserved === true] satisfies [
                  string,
                  string,
                  boolean,
                ],
              ]),
        );
        return result;
      },
      [],
    );
    return {
      body: pairs
        .map(([name, item, allowReserved]) => {
          return `${encodeURIComponent(name)}=${encodeFormValue(item, allowReserved)}`;
        })
        .join('&'),
      contentType: mediaType,
    };
  }

  const boundary = 'speccy-boundary';
  const lines: string[] = [];
  for (const [name, fieldValue] of fields) {
    const encoding = media.encoding?.[name];
    const values =
      Array.isArray(fieldValue) && encoding?.explode !== false
        ? fieldValue
        : [
            Array.isArray(fieldValue)
              ? fieldValue.map(scalar).join(',')
              : fieldValue,
          ];
    for (const item of values) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Disposition: form-data; name="${name}"`);
      if (encoding?.contentType)
        lines.push(`Content-Type: ${encoding.contentType}`);
      for (const [headerName, header] of Object.entries(
        encoding?.headers ?? {},
      )) {
        const headerValue =
          header.example ??
          (typeof header.schema === 'object'
            ? header.schema.default
            : undefined);
        if (headerValue !== undefined)
          lines.push(`${headerName}: ${scalar(headerValue)}`);
      }
      lines.push('', scalar(item));
    }
  }
  lines.push(`--${boundary}--`, '');
  return {
    body: lines.join('\r\n'),
    contentType: `${mediaType}; boundary=${boundary}`,
  };
}
