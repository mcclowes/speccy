/**
 * ---
 * purpose: Renders the webhooks reference page listing every event the API delivers.
 * related:
 *   - ./Speccy.tsx - Mounts this page for the `reference/webhooks` route.
 *   - ./operationSummary.tsx - Shared operation links.
 * ---
 */

import type { ApiDiagnostic, OperationModel } from 'speccy-core';
import { InlineDiagnostics } from './DeveloperDiagnostics';
import { Markdown } from './Markdown';
import { OperationLink } from './operationSummary';
import type { SpeccyRoute } from './types';

export function WebhookReference({
  webhooks,
  diagnostics = [],
  onViewAllDiagnostics,
  onNavigate,
  hrefForRoute,
}: {
  webhooks: OperationModel[];
  diagnostics?: ApiDiagnostic[];
  onViewAllDiagnostics: () => void;
  onNavigate: (operationId: string) => void;
  hrefForRoute: (route: SpeccyRoute) => string;
}) {
  return (
    <section className="sp-tag sp-reference-section" id="reference-webhooks">
      <div className="sp-tag-heading">
        <div>
          <span className="sp-tag-kicker">Reference</span>
          <h2>Webhooks</h2>
        </div>
        <Markdown>
          Events this API delivers to a URL you register, rather than requests
          you send.
        </Markdown>
      </div>
      <InlineDiagnostics
        diagnostics={diagnostics}
        onViewAll={onViewAllDiagnostics}
      />
      {webhooks.length === 0 ? (
        <div className="sp-empty">This spec doesn’t define any webhooks.</div>
      ) : (
        <div className="sp-operation-list">
          {webhooks.map((item) => (
            <OperationLink
              item={item}
              onNavigate={onNavigate}
              hrefForRoute={hrefForRoute}
              key={item.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
