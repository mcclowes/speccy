/**
 * ---
 * purpose: Persists renderer UI state in localStorage while remaining safe during server rendering.
 * related:
 *   - ./Speccy.tsx - Persists navigation, authorization, and request parameter state.
 *   - ./ReferenceSections.tsx - Persists reference navigation expansion.
 * ---
 */

import { useEffect, useState } from 'react';

export function useLocalState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initialValue : (JSON.parse(stored) as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage may be unavailable or full. Keep the in-memory state working.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
