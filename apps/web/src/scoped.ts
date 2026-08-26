/**
 * ---
 * purpose: Pairs each studio class name with its CSS-module counterpart so global and scoped styles both apply.
 * related:
 *   - ./App.module.css - Viewer chrome and reference workspace styling.
 *   - ./App.tsx - Studio and preview shells styled with these names.
 * ---
 */

import styles from './App.module.css';

export function scoped(className: string) {
  return className
    .split(' ')
    .flatMap((name) => (name ? [name, styles[name]] : []))
    .filter(Boolean)
    .join(' ');
}
