/**
 * ---
 * purpose: Defines the shared visual primitives used to present OpenAPI operations and disclosure controls consistently.
 * related:
 *   - ./ResourceDetails.tsx - Composes these primitives into parameter, request body, and response presentations.
 *   - ./styles.css - Owns the sp-ui-* design-system styles.
 * ---
 */

import { Fragment, type ReactNode } from 'react';
import { WebhookIcon } from './WebhookIcon';

export const HTTP_METHOD_LABELS: Record<string, string> = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
  options: 'OPTIONS',
  head: 'HEAD',
  trace: 'TRACE',
};

export function httpMethodLabel(method: string): string {
  return HTTP_METHOD_LABELS[method] ?? method.toUpperCase();
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sp-visually-hidden">{children}</span>;
}

export function DisclosureChevron({ className = '' }: { className?: string }) {
  return (
    <span
      className={`sp-disclosure-chevron ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

export function DisclosureContent({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`sp-disclosure-content ${className}`.trim()}>
      {children}
    </div>
  );
}

export function RequiredMark() {
  return (
    <span className="sp-required" title="Required" aria-label="Required">
      *
    </span>
  );
}

export function MethodBadge({
  method,
  compact = false,
  webhook = false,
}: {
  method: string;
  compact?: boolean;
  webhook?: boolean;
}) {
  const className = `sp-method-badge sp-method-badge-${compact ? 'compact' : 'default'} sp-method-${method}${webhook ? ' is-webhook' : ''}`;
  return (
    <span className={className} title={webhook ? 'Webhook' : undefined}>
      {webhook ? (
        <>
          <WebhookIcon />
          <VisuallyHidden>Webhook</VisuallyHidden>
        </>
      ) : (
        httpMethodLabel(method)
      )}
    </span>
  );
}

export function ApiPath({
  value,
  className = '',
  wrap = false,
}: {
  value: string;
  className?: string;
  wrap?: boolean;
}) {
  const parts = value.split(/(\{[^{}]+\})/g);
  return (
    <code
      className={`sp-api-path ${className}`.trim()}
      title={wrap ? value : undefined}
    >
      {parts.map((part, index) =>
        part.startsWith('{') && part.endsWith('}') ? (
          <span className="sp-path-parameter" key={`${part}-${index}`}>
            {part}
          </span>
        ) : (
          <Fragment key={`${part}-${index}`}>
            {wrap
              ? part.split('/').map((segment, segmentIndex) => (
                  <Fragment key={`${segment}-${segmentIndex}`}>
                    {segmentIndex > 0 && (
                      <>
                        <wbr />/
                      </>
                    )}
                    {segment}
                  </Fragment>
                ))
              : part}
          </Fragment>
        ),
      )}
    </code>
  );
}
