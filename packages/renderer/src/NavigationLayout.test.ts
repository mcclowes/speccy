import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('navigation layout', () => {
  it('separates a tag that follows a tag group', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    expect(css).toMatch(
      /\.sp-nav-tag-group \+ \.sp-nav-group\s*{[^}]*margin-top:\s*32px;/,
    );
  });

  it('clamps sidebar endpoint labels to one line by default', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    expect(css).toMatch(/\.sp-nav-operation-label \{[^}]*white-space: nowrap;/);
  });

  it('wraps sidebar endpoint labels onto a second line when configured', () => {
    const css = readFileSync('src/styles.css', 'utf8');

    expect(css).toMatch(
      /\.sp-nav-wrapped-labels \.sp-nav-operation-label \{[^}]*-webkit-line-clamp: 2;[^}]*white-space: normal;/,
    );
  });
});
