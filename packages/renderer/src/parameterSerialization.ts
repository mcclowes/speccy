/**
 * ---
 * purpose: Serializes parameter values according to OpenAPI 3.1 style and explode rules.
 * related:
 *   - ./OperationDetails.tsx - Uses serialized values in generated and live requests.
 *   - ../../core/src/types.ts - Defines the Parameter contract accepted here.
 * ---
 */

import type { Parameter } from 'speccy-core';

export type SerializedParameter = string | Array<[string, string]>;

function primitive(value: unknown): string {
  if (value === null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function entries(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value).map(([key, item]) => [key, primitive(item)]);
}

function flattened(value: unknown, explode: boolean, separator: string) {
  if (Array.isArray(value)) return value.map(primitive).join(separator);
  const fields = entries(value);
  if (fields.length > 0)
    return fields
      .flatMap(([key, item]) => (explode ? [`${key}=${item}`] : [key, item]))
      .join(separator);
  return primitive(value);
}

export function serializeParameter(
  parameter: Pick<Parameter, 'name' | 'in' | 'style' | 'explode' | 'content'>,
  value: unknown,
): SerializedParameter {
  const name = parameter.name ?? '';
  if (parameter.content) {
    const contentValue =
      typeof value === 'string' ? value : JSON.stringify(value);
    if (parameter.in === 'query') return [[name, contentValue]];
    if (parameter.in === 'cookie') return `${name}=${contentValue}`;
    return contentValue;
  }
  const style =
    parameter.style ??
    (parameter.in === 'query' || parameter.in === 'cookie' ? 'form' : 'simple');
  const explode = parameter.explode ?? style === 'form';
  const array = Array.isArray(value) ? value.map(primitive) : undefined;
  const object = entries(value);

  if (parameter.in === 'query') {
    if (style === 'deepObject' && object.length > 0)
      return object.map(([key, item]) => [`${name}[${key}]`, item]);
    if (style === 'spaceDelimited' && array) return [[name, array.join(' ')]];
    if (style === 'pipeDelimited' && array) return [[name, array.join('|')]];
    if (explode && array) return array.map((item) => [name, item]);
    if (explode && object.length > 0) return object;
    return [[name, flattened(value, false, ',')]];
  }

  if (parameter.in === 'cookie') {
    if (explode && object.length > 0)
      return object.map(([key, item]) => `${key}=${item}`).join('&');
    if (explode && array)
      return array.map((item) => `${name}=${item}`).join('&');
    return `${name}=${flattened(value, false, ',')}`;
  }

  if (style === 'label') {
    const separator = explode ? '.' : ',';
    return `.${flattened(value, explode, separator)}`;
  }
  if (style === 'matrix') {
    if (explode && array)
      return array.map((item) => `;${name}=${item}`).join('');
    if (explode && object.length > 0)
      return object.map(([key, item]) => `;${key}=${item}`).join('');
    return `;${name}=${flattened(value, false, ',')}`;
  }

  return flattened(value, explode, ',');
}
