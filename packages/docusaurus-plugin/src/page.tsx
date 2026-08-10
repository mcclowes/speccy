/**
 * ---
 * purpose: Renders a generated Docusaurus reference route from the plugin's serialized module data.
 * related:
 *   - ./index.ts - Creates the route and supplies its reference module.
 *   - ./client.tsx - Provides the shared Docusaurus wrapper component.
 * ---
 */

import { OpenAPI } from './client';
import type { OpenAPIDocument, SpeccyProps } from 'speccy-renderer';

interface ReferenceData {
  spec: string | OpenAPIDocument;
  route: string;
  renderer?: Omit<SpeccyProps, 'spec'>;
}

export default function SpeccyPage({
  reference,
}: {
  reference: ReferenceData;
}) {
  return (
    <OpenAPI
      spec={reference.spec}
      basePath={reference.route}
      showSidebar
      showDeveloperHints={process.env.NODE_ENV !== 'production'}
      {...reference.renderer}
    />
  );
}
