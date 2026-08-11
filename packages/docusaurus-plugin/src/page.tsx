/**
 * ---
 * purpose: Renders a generated Docusaurus reference route from the plugin's serialized module data.
 * related:
 *   - ./index.ts - Creates the route and supplies its reference module.
 *   - ./client.tsx - Provides the shared Docusaurus wrapper component.
 * ---
 */

import Layout from '@theme/Layout';
import { OpenAPI } from './client';
import { referenceMetadata } from './metadata';
import type {
  OpenAPIDocument,
  SpeccyProps,
  SpeccyRoute,
} from 'speccy-renderer';

interface ReferenceData {
  spec: string | OpenAPIDocument;
  route: string;
  layout: false | { noFooter: boolean };
  renderer?: Omit<SpeccyProps, 'spec'>;
}

export default function SpeccyPage({
  reference,
  initialRoute,
}: {
  reference: ReferenceData;
  initialRoute?: SpeccyRoute;
}) {
  const referenceElement = (
    <OpenAPI
      spec={reference.spec}
      basePath={reference.route}
      showSidebar
      showDeveloperHints={process.env.NODE_ENV !== 'production'}
      {...reference.renderer}
      initialRoute={initialRoute}
    />
  );

  if (reference.layout === false) return referenceElement;

  const metadata = referenceMetadata(reference.spec, initialRoute);
  return (
    <Layout
      title={metadata.title}
      description={metadata.description}
      noFooter={reference.layout.noFooter}
    >
      {referenceElement}
    </Layout>
  );
}
