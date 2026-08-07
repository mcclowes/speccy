/**
 * ---
 * purpose: Safely renders Markdown supplied by OpenAPI description fields.
 * related:
 *   - ./Speccy.tsx - Routes descriptive API text through this component.
 *   - ./styles.css - Styles the generated Markdown elements.
 * ---
 */

import { useState } from 'react';
import MarkdownRenderer from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Markdown({ children, className = '' }: { children?: string; className?: string }) {
  if (!children) return null;

  return (
    <div className={`sp-markdown ${className}`}>
      <MarkdownRenderer remarkPlugins={[remarkGfm]}>{children}</MarkdownRenderer>
    </div>
  );
}

const COLLAPSIBLE_DESCRIPTION_LENGTH = 120;

export function CollapsibleMarkdown({ children, className = '' }: { children?: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!children) return null;

  const collapsible = children.length > COLLAPSIBLE_DESCRIPTION_LENGTH;
  return (
    <div className={`sp-collapsible-markdown ${className} ${collapsible ? 'is-collapsible' : ''} ${expanded ? 'is-expanded' : ''}`}>
      <Markdown className={className}>{children}</Markdown>
      {collapsible && (
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : 'Show all…'}
        </button>
      )}
    </div>
  );
}
