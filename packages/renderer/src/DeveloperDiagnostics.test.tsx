import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('developer diagnostics layout', () => {
  it('allows drawer rows and cards to shrink within the viewport', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    for (const selector of ['.sp-diagnostics-drawer', '.sp-diagnostics-list', '.sp-diagnostic-card', '.sp-diagnostic-card-head', '.sp-diagnostic-card footer']) {
      expect(css).toMatch(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{[^}]*min-width: 0;`));
    }
    expect(css).toMatch(/\.sp-diagnostics-drawer \{[^}]*overflow-x: hidden;/);
  });
});
