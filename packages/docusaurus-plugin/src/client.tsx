/**
 * ---
 * purpose: Exposes the Docusaurus and MDX-friendly OpenAPI component with sensible embedded-page defaults.
 * related:
 *   - ./index.ts - Generates full-page routes that use the same component.
 *   - ../../renderer/src/Speccy.tsx - Shared renderer implementation.
 * ---
 */

import { useAllPluginInstancesData } from '@docusaurus/useGlobalData';
import type { ReactNode } from 'react';
import { Speccy, type SpeccyProps } from 'speccy-renderer';
import {
  OperationReferenceProvider,
  type OperationReferenceSource,
} from 'speccy-renderer/docs';
import type { SpeccyPluginGlobalData } from './index';

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

export function SpeccyOperationReferenceProvider({
  children,
}: {
  children?: ReactNode;
}) {
  const instances = useAllPluginInstancesData('docusaurus-plugin-speccy') ?? {};
  const apis = Object.values(instances).map((value) => {
    const data = value as SpeccyPluginGlobalData;
    return {
      name: data.name,
      basePath: data.route,
      catalog: data.operations,
    } satisfies OperationReferenceSource;
  });
  return (
    <OperationReferenceProvider apis={apis}>
      {children}
    </OperationReferenceProvider>
  );
}

export { Speccy } from 'speccy-renderer';
export type { OpenAPIDocument, SpeccyProps } from 'speccy-renderer';
export {
  EndpointStrip,
  OperationCard,
  OperationLink,
  OperationPreview,
  OperationReferenceProvider,
} from 'speccy-renderer/docs';
export type {
  DescribedOperationReferenceProps,
  OperationPreviewProps,
  OperationReferenceLookup,
  OperationReferenceProps,
  OperationReferenceProviderProps,
  OperationReferenceSource,
} from 'speccy-renderer/docs';
