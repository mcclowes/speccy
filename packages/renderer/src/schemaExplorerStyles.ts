/**
 * ---
 * purpose: Maps schema explorer class names onto both their global and CSS-module forms.
 * related:
 *   - ./SchemaExplorer.module.css - Owns the class names this resolves.
 *   - ./SchemaExplorer.tsx - Renders the explorer shell with these class names.
 * ---
 */

import styles from './SchemaExplorer.module.css';

export function scoped(className: string) {
  return className
    .split(' ')
    .flatMap((name) => (name ? [name, styles[name]] : []))
    .filter(Boolean)
    .join(' ');
}
