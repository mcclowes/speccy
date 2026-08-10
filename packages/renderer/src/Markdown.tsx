/**
 * ---
 * purpose: Safely renders Markdown supplied by OpenAPI description fields.
 * related:
 *   - ./Speccy.tsx - Routes descriptive API text through this component.
 *   - ./styles.css - Styles the generated Markdown elements.
 * ---
 */

import MarkdownRenderer from 'react-markdown';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import styles from './Markdown.module.css';

type MarkdownNode = {
  type?: string;
  name?: string;
  value?: string;
  data?: {
    directiveLabel?: boolean;
    hName?: string;
    hProperties?: Record<string, string | string[]>;
  };
  children?: MarkdownNode[];
};

const admonitionTypes = new Set(['note', 'tip', 'info', 'warning', 'danger']);

function remarkAdmonitions() {
  return (tree: MarkdownNode) => {
    function transform(node: MarkdownNode) {
      if (
        node.type === 'containerDirective' &&
        node.name &&
        admonitionTypes.has(node.name)
      ) {
        node.data = {
          ...node.data,
          hName: 'aside',
          hProperties: {
            className: [
              'sp-admonition',
              styles.admonition!,
              `sp-admonition-${node.name}`,
              styles[node.name]!,
            ],
          },
        };

        const label = node.children?.find(
          (child) => child.data?.directiveLabel,
        );
        if (label) {
          label.data = {
            ...label.data,
            hName: 'div',
            hProperties: {
              className: `sp-admonition-title ${styles.admonitionTitle}`,
            },
          };
        } else {
          node.children?.unshift({
            type: 'paragraph',
            data: {
              hName: 'div',
              hProperties: {
                className: `sp-admonition-title ${styles.admonitionTitle}`,
              },
            },
            children: [
              {
                type: 'text',
                value: node.name.charAt(0).toUpperCase() + node.name.slice(1),
              },
            ],
          });
        }
      }

      node.children?.forEach(transform);
    }

    transform(tree);
  };
}

function remarkRemoveHtmlComments() {
  return (tree: MarkdownNode) => {
    function removeComments(node: MarkdownNode) {
      if (!node.children) return;
      node.children = node.children.filter(
        (child) =>
          child.type !== 'html' ||
          !/^<!--[\s\S]*-->$/.test(child.value?.trim() ?? ''),
      );
      node.children.forEach(removeComments);
    }

    removeComments(tree);
  };
}

export function Markdown({
  children,
  className = '',
}: {
  children?: string;
  className?: string;
}) {
  if (!children) return null;

  return (
    <div className={`sp-markdown ${styles.markdown} ${className}`}>
      <MarkdownRenderer
        remarkPlugins={[
          remarkGfm,
          remarkDirective,
          remarkAdmonitions,
          remarkRemoveHtmlComments,
        ]}
      >
        {children}
      </MarkdownRenderer>
    </div>
  );
}
