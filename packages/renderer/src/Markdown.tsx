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

type MarkdownNode = { type?: string; value?: string; children?: MarkdownNode[] };

function remarkRemoveHtmlComments() {
  return (tree: MarkdownNode) => {
    function removeComments(node: MarkdownNode) {
      if (!node.children) return;
      node.children = node.children.filter((child) => child.type !== 'html' || !/^<!--[\s\S]*-->$/.test(child.value?.trim() ?? ''));
      node.children.forEach(removeComments);
    }

    removeComments(tree);
  };
}

export function Markdown({ children, className = '' }: { children?: string; className?: string }) {
  if (!children) return null;

  return (
    <div className={`sp-markdown ${className}`}>
      <MarkdownRenderer remarkPlugins={[remarkGfm, remarkRemoveHtmlComments]}>{children}</MarkdownRenderer>
    </div>
  );
}
