/**
 * ---
 * purpose: Safely renders Markdown supplied by OpenAPI description fields.
 * related:
 *   - ./Speccy.tsx - Routes descriptive API text through this component.
 *   - ./styles.css - Styles the generated Markdown elements.
 * ---
 */

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
