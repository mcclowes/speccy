/**
 * ---
 * purpose: PROTOTYPE - switches among three query parameter layouts on the existing endpoint route.
 * related:
 *   - ./App.tsx - Mounts the switcher and passes the selected variant into the renderer.
 *   - ../../../packages/renderer/src/Speccy.tsx - Renders the three temporary parameter layouts.
 * ---
 */

import { useEffect } from 'react';

export type ParameterPrototypeVariant = 'A' | 'B' | 'C';

const VARIANTS: Array<{ key: ParameterPrototypeVariant; label: string }> = [
  { key: 'A', label: 'Progressive list' },
  { key: 'B', label: 'Collapsed summary' },
  { key: 'C', label: 'Compact index' },
];

export function readParameterPrototypeVariant(): ParameterPrototypeVariant {
  const value = new URLSearchParams(window.location.search).get('variant')?.toUpperCase();
  return value === 'B' || value === 'C' ? value : 'A';
}

export function ParameterPrototypeSwitcher({ variant, onChange }: { variant: ParameterPrototypeVariant; onChange: (variant: ParameterPrototypeVariant) => void }) {
  const currentIndex = VARIANTS.findIndex((item) => item.key === variant);

  function select(index: number) {
    const next = VARIANTS[(index + VARIANTS.length) % VARIANTS.length]!;
    const url = new URL(window.location.href);
    url.searchParams.set('variant', next.key);
    window.history.replaceState({}, '', url);
    onChange(next.key);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable]')) return;
      if (event.key === 'ArrowLeft') select(currentIndex - 1);
      if (event.key === 'ArrowRight') select(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const current = VARIANTS[currentIndex]!;
  return <div className="parameter-prototype-switcher" aria-label="Parameter layout prototype">
    <button type="button" onClick={() => select(currentIndex - 1)} aria-label="Previous variant">←</button>
    <span><small>Query parameter prototype</small><strong>{current.key} · {current.label}</strong></span>
    <button type="button" onClick={() => select(currentIndex + 1)} aria-label="Next variant">→</button>
  </div>;
}
