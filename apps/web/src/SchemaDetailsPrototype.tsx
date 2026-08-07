/**
 * PROTOTYPE - Three schema field-detail affordances, switchable via ?variant=.
 * Delete this file after choosing a direction.
 */

import { Fragment, useEffect, useState, type ReactNode } from 'react';

type VariantKey = 'info' | 'label' | 'tooltip';

const VARIANTS: { key: VariantKey; label: string }[] = [
  { key: 'info', label: 'Info icon' },
  { key: 'label', label: 'Details label' },
  { key: 'tooltip', label: 'Tooltip' },
];

function PrototypeVariant({ name, children }: { name: VariantKey; children: ReactNode }) {
  return <div className={`schema-details-prototype schema-details-prototype-${name}`}>{children}</div>;
}

export function InfoIconVariant({ children }: { children: ReactNode }) {
  return <PrototypeVariant name="info">{children}</PrototypeVariant>;
}

export function DetailsLabelVariant({ children }: { children: ReactNode }) {
  return <PrototypeVariant name="label">{children}</PrototypeVariant>;
}

export function TooltipVariant({ children }: { children: ReactNode }) {
  return <PrototypeVariant name="tooltip">{children}</PrototypeVariant>;
}

const COMPONENTS = {
  info: InfoIconVariant,
  label: DetailsLabelVariant,
  tooltip: TooltipVariant,
};

function variantFromUrl(): VariantKey {
  const value = new URLSearchParams(window.location.search).get('variant');
  return VARIANTS.some((variant) => variant.key === value) ? value as VariantKey : 'info';
}

export function useSchemaDetailsPrototype() {
  const [variant, setVariant] = useState<VariantKey>(variantFromUrl);

  const select = (next: VariantKey) => {
    const url = new URL(window.location.href);
    url.searchParams.set('variant', next);
    window.history.replaceState({}, '', url);
    setVariant(next);
  };

  const cycle = (direction: -1 | 1) => {
    const index = VARIANTS.findIndex((candidate) => candidate.key === variant);
    select(VARIANTS[(index + direction + VARIANTS.length) % VARIANTS.length]!.key);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, [contenteditable]')) return;
      if (event.key === 'ArrowLeft') cycle(-1);
      if (event.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [variant]);

  return { variant, Variant: import.meta.env.PROD ? Fragment : COMPONENTS[variant], cycle };
}

export function SchemaDetailsPrototypeSwitcher({ variant, cycle }: {
  variant: VariantKey;
  cycle: (direction: -1 | 1) => void;
}) {
  if (import.meta.env.PROD) return null;
  const current = VARIANTS.find((candidate) => candidate.key === variant)!;
  return (
    <nav className="schema-details-prototype-switcher" aria-label="Schema details prototype variants">
      <button type="button" onClick={() => cycle(-1)} aria-label="Previous variant">←</button>
      <span>{current.key.toUpperCase()} · {current.label}</span>
      <button type="button" onClick={() => cycle(1)} aria-label="Next variant">→</button>
    </nav>
  );
}
