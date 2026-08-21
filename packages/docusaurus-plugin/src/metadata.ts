/**
 * ---
 * purpose: Derives Docusaurus page titles and descriptions for every generated reference route.
 * related:
 *   - ./index.ts - Uses the shared slugging rule while generating static routes.
 *   - ./page.tsx - Applies the derived metadata through the Docusaurus layout.
 * ---
 */

import {
  createReferenceModel,
  parseSpec,
  type OpenAPIDocument,
  type SpeccyRoute,
} from 'speccy-renderer';

export interface ReferenceMetadata {
  title: string;
  description?: string;
}

export function slugifyReferenceName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function referenceMetadata(
  spec: string | OpenAPIDocument,
  route: SpeccyRoute = { page: 'overview' },
): ReferenceMetadata {
  const model = createReferenceModel(parseSpec(spec));
  const apiTitle = model.document.info?.title ?? 'API';
  const apiDescription = model.document.info?.description;

  if (route.page === 'overview') {
    return { title: `${apiTitle} reference`, description: apiDescription };
  }

  if (route.page === 'operation') {
    const operation = [...model.operations, ...model.webhooks].find(
      (item) => item.id === route.operationId,
    );
    const title =
      operation?.operation.summary ??
      operation?.operation.operationId ??
      operation?.path ??
      'API operation';
    return {
      title: `${title} | ${apiTitle}`,
      description: operation?.operation.description ?? apiDescription,
    };
  }

  if (route.page === 'tag') {
    const tag = model.tags.find(
      (item) => (slugifyReferenceName(item.name) || item.name) === route.tag,
    );
    return {
      title: `${tag?.name ?? 'API operations'} | ${apiTitle}`,
      description: tag?.description ?? apiDescription,
    };
  }

  if (route.section === 'webhooks') {
    return {
      title: `Webhooks | ${apiTitle}`,
      description: `Webhook events ${apiTitle} delivers.`,
    };
  }

  const sectionTitle = route.section
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/^./, (character) => character.toUpperCase());
  return {
    title: `${sectionTitle} | ${apiTitle}`,
    description: `Reusable ${sectionTitle.toLowerCase()} for ${apiTitle}.`,
  };
}
