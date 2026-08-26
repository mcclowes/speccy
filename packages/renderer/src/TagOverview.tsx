/**
 * ---
 * purpose: Renders a tag's landing page: description, diagnostics, and its operation list.
 * related:
 *   - ./Speccy.tsx - Mounts this page when the active route is a tag.
 *   - ./operationSummary.tsx - Shared operation links and tag icon.
 * ---
 */

import type { ApiDiagnostic, OperationModel, TagModel } from 'speccy-core';
import { InlineDiagnostics } from './DeveloperDiagnostics';
import { Markdown } from './Markdown';
import { ExternalDocsLink, OperationLink, TagIcon } from './operationSummary';
import type { SpeccyRoute } from './types';

export function TagOverview({
  tag,
  operations,
  diagnostics = [],
  onViewAllDiagnostics,
  onNavigate,
  hrefForRoute,
}: {
  tag: TagModel;
  operations: OperationModel[];
  diagnostics?: ApiDiagnostic[];
  onViewAllDiagnostics: () => void;
  onNavigate: (operationId: string) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
}) {
  return (
    <section className="sp-tag-overview">
      <div className="sp-tag-overview-intro">
        <h1 className="sp-tag-title">
          <TagIcon tag={tag} />
          {tag.name}
        </h1>
        <Markdown>{tag.description}</Markdown>
        <ExternalDocsLink docs={tag.externalDocs} />
        <InlineDiagnostics
          diagnostics={diagnostics.filter(
            (diagnostic) =>
              diagnostic.tag === tag.name && !diagnostic.operationId,
          )}
          onViewAll={onViewAllDiagnostics}
        />
        <Markdown className="sp-tag-long-description">
          {tag.longDescription}
        </Markdown>
      </div>
      <div className="sp-tag-overview-operations">
        <h2>Operations</h2>
        <div className="sp-operation-list">
          {operations.map((item) => (
            <OperationLink
              item={item}
              onNavigate={onNavigate}
              hrefForRoute={hrefForRoute}
              key={item.id}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
