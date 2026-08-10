import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('parameter prototype styles', () => {
  it('joins the expanded optional parameter explorer to its summary card', () => {
    const css = readFileSync('src/parameter-prototype.css', 'utf8');

    expect(css).toMatch(
      /\.sp-optional-parameter-docs > \.sp-schema-explorer \.sp-schema-explorer-shell \{[^}]*border: 0;[^}]*border-top: 1px solid var\(--sp-line\);[^}]*border-radius: 0;/,
    );
  });
});
