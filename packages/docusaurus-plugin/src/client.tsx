/**
 * ---
 * purpose: Exposes the Docusaurus and MDX-friendly OpenAPI component with sensible embedded-page defaults.
 * related:
 *   - ./index.ts - Generates full-page routes that use the same component.
 *   - ../../renderer/src/Speccy.tsx - Shared renderer implementation.
 * ---
 */

import { Speccy, type SpeccyProps } from '@mcclowes/speccy-renderer';

export type OpenAPIProps = SpeccyProps;

export function OpenAPI({ showSidebar = false, ...props }: OpenAPIProps) {
  return <Speccy showSidebar={showSidebar} {...props} />;
}

export { Speccy } from '@mcclowes/speccy-renderer';
export type { OpenAPIDocument, SpeccyProps } from '@mcclowes/speccy-renderer';
