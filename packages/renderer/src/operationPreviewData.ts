/**
 * ---
 * purpose: Resolves layered request values and response examples for portable operation previews.
 * related:
 *   - ./OperationReference.tsx - Renders the resolved path, query, headers, body, and response.
 *   - ./OperationDetails.tsx - Uses the same OpenAPI example precedence in the full operation renderer.
 * ---
 */

import {
  parseSpec,
  resolveRefs,
  type MediaType,
  type OpenAPIDocument,
  type Operation,
  type Parameter,
  type Schema,
} from 'speccy-core';

export interface OperationPreviewRequestValues {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
}

export interface OperationPreviewData {
  request: OperationPreviewRequestValues;
  response?: unknown;
}

function schemaExample(schema: Schema | undefined): unknown {
  if (schema === undefined) return undefined;
  if (typeof schema === 'boolean') return schema ? {} : undefined;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.oneOf?.[0]) return schemaExample(schema.oneOf[0]);
  if (schema.anyOf?.[0]) return schemaExample(schema.anyOf[0]);
  if (schema.allOf?.length) {
    return Object.assign(
      {},
      ...schema.allOf
        .map(schemaExample)
        .filter((value) => value && typeof value === 'object'),
    );
  }
  if (schema.type === 'array' || schema.items)
    return schema.items ? [schemaExample(schema.items)] : [];
  if (schema.type === 'object' || schema.properties)
    return Object.fromEntries(
      Object.entries(schema.properties ?? {})
        .filter(([, property]) => {
          const value = typeof property === 'boolean' ? undefined : property;
          return !value?.readOnly;
        })
        .map(([name, property]) => [name, schemaExample(property)]),
    );
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return true;
  if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
  if (schema.format === 'date') return '2024-01-01';
  if (schema.format === 'uuid') return '00000000-0000-4000-8000-000000000000';
  return 'string';
}

function mediaExample(media: MediaType | undefined): unknown {
  if (!media) return undefined;
  if (media.example !== undefined) return media.example;
  for (const example of Object.values(media.examples ?? {})) {
    if (example.value !== undefined) return example.value;
    if (example.externalValue !== undefined) return example.externalValue;
  }
  return schemaExample(media.schema);
}

function parameterExample(parameter: Parameter): unknown {
  return parameter.example ?? schemaExample(parameter.schema);
}

export function deriveOperationPreviewData(
  spec: OpenAPIDocument | string | undefined,
  method: string,
  path: string,
): OperationPreviewData {
  if (!spec) return { request: {} };
  const document = resolveRefs(parseSpec(spec));
  const pathItem = document.paths?.[path];
  const operation = pathItem?.[
    method.toLowerCase() as keyof typeof pathItem
  ] as Operation | undefined;
  if (!operation || typeof operation !== 'object') return { request: {} };

  const parameters = [
    ...(pathItem?.parameters ?? []),
    ...(operation.parameters ?? []),
  ];
  const valuesFor = (location: string) =>
    Object.fromEntries(
      parameters
        .filter((parameter) => parameter.in === location)
        .map((parameter) => [
          parameter.name ?? 'unnamed',
          parameterExample(parameter),
        ]),
    );
  const requestMedia = Object.values(operation.requestBody?.content ?? {})[0];
  const body = mediaExample(requestMedia);
  const response =
    Object.entries(operation.responses ?? {}).find(([code]) =>
      code.startsWith('2'),
    )?.[1] ?? Object.values(operation.responses ?? {})[0];
  const responseMedia = Object.values(response?.content ?? {})[0];

  return {
    request: {
      path: valuesFor('path'),
      query: valuesFor('query'),
      headers: valuesFor('header'),
      ...(body !== undefined ? { body } : {}),
    },
    response: mediaExample(responseMedia),
  };
}

export function mergeOperationPreviewRequestValues(
  derived: OperationPreviewRequestValues,
  overrides: OperationPreviewRequestValues | undefined,
): OperationPreviewRequestValues {
  return {
    path: { ...derived.path, ...overrides?.path },
    query: { ...derived.query, ...overrides?.query },
    headers: { ...derived.headers, ...overrides?.headers },
    ...('body' in derived ? { body: derived.body } : {}),
    ...(overrides && 'body' in overrides ? { body: overrides.body } : {}),
  };
}
