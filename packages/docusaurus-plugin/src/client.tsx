/**
 * ---
 * purpose: Exposes the Docusaurus and MDX-friendly OpenAPI component with sensible embedded-page defaults.
 * related:
 *   - ./index.ts - Generates full-page routes that use the same component.
 *   - ../../renderer/src/Speccy.tsx - Shared renderer implementation.
 * ---
 */

import { Speccy, type SpeccyProps } from 'speccy-renderer';

export type OpenAPIProps = SpeccyProps;

export function OpenAPI({
  className = '',
  showSidebar = false,
  showThemeToggle = false,
  theme = 'inherit',
  ...props
}: OpenAPIProps) {
  return (
    <Speccy
      className={`sp-docusaurus ${className}`.trim()}
      showSidebar={showSidebar}
      showThemeToggle={showThemeToggle}
      theme={theme}
      {...props}
    />
  );
}

export { Speccy } from 'speccy-renderer';
export type { OpenAPIDocument, SpeccyProps } from 'speccy-renderer';
