/**
 * ---
 * purpose: Defines the renderer's public React configuration.
 * related:
 *   - ../../core/src/types.ts - Supplies the OpenAPI document shapes referenced here.
 *   - ./Speccy.tsx - Consumes this configuration.
 * ---
 */

import type { OpenAPIDocument, SpectralDiagnosticInput } from '@speccy/core';

export type SpeccyRoute =
  | { page: 'overview' }
  | { page: 'operation'; operationId: string }
  | { page: 'tag'; tag: string }
  | { page: 'reference'; section: string };

export interface SpeccyProps {
  spec: OpenAPIDocument | string;
  className?: string;
  defaultExpanded?: boolean;
  showSidebar?: boolean;
  /** Shows the renderer's persistent light/dark theme control. */
  showThemeToggle?: boolean;
  theme?: 'light' | 'dark' | 'system';
  accentColor?: string;
  logo?: React.ReactNode;
  /** URL prefix for endpoint pages. Each operation is rendered at `${basePath}/${operationId}`. */
  basePath?: string;
  /** Current route when navigation is controlled by the host application. */
  route?: SpeccyRoute;
  /** Handles navigation in controlled mode instead of writing to browser history. */
  onNavigate?: (route: SpeccyRoute) => void;
  /** Creates link targets in controlled mode. */
  hrefForRoute?: (route: SpeccyRoute) => string;
  onError?: (error: Error) => void;
  /** Shows contextual authoring suggestions that are omitted from published previews. */
  showDeveloperHints?: boolean;
  /** Optional previous contract used to surface potentially breaking changes. */
  previousSpec?: OpenAPIDocument | string;
  /** Spectral results to present alongside Speccy's built-in guidance. */
  spectralDiagnostics?: SpectralDiagnosticInput[];
  /** PROTOTYPE: separates required parameters from optional parameters added on demand. */
  parameterPrototype?: boolean;
}
