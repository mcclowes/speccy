/**
 * ---
 * purpose: Removes editorial fields and OpenAPI extensions before a material contract comparison.
 * related:
 *   - ./diffSpecs.ts - Compares the normalized documents.
 *   - ../../cli/src/run.ts - Offers this normalization through the diff command.
 * ---
 */

import type { OpenAPIDocument } from './types';

/**
 * Returns a copy suitable for a material diff: descriptions and `x-` extension fields are omitted
 * everywhere, while standard OpenAPI fields, including summaries, remain intact.
 */
export function stripNonMaterialFields(
  document: OpenAPIDocument,
): OpenAPIDocument {
  function strip(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(strip);
    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'description' && !key.startsWith('x-'))
        .map(([key, child]) => [key, strip(child)]),
    );
  }

  return strip(document) as OpenAPIDocument;
}
