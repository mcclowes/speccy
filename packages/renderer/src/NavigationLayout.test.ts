import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('navigation layout', () => {
  it('separates a tag that follows a tag group', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    expect(css).toMatch(
      /\.sp-nav-tag-group \+ \.sp-nav-group\s*{[^}]*margin-top:\s*32px;/,
    );
  });
});
