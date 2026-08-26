/**
 * ---
 * purpose: Owns a Set of toggled keys (folded JSON paths, expanded tree rows, collapsed sections) with a single toggle action.
 * related:
 *   - ./CodeBlock.tsx - Folds JSON tree nodes.
 *   - ./SchemaExplorer.tsx - Expands schema tree rows.
 *   - ./OperationReference.tsx - Collapses preview sections.
 * ---
 */

import { useState } from 'react';

export function useToggleSet<T>(
  initial?: () => Iterable<T>,
): [Set<T>, (item: T) => void] {
  const [items, setItems] = useState<Set<T>>(() => new Set(initial?.()));
  const toggle = (item: T) =>
    setItems((current) => {
      const next = new Set(current);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  return [items, toggle];
}
