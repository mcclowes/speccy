import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('request control surfaces', () => {
  it('uses the raised surface for request example and language selectors', () => {
    const styles = readFileSync('src/styles.css', 'utf8');
    const requestSampleStyles = readFileSync(
      'src/RequestSample.module.css',
      'utf8',
    );

    expect(styles).toMatch(
      /\.sp-request-example \.sp-example-select \{[^}]*background: var\(--sp-surface\);/,
    );
    expect(requestSampleStyles).toMatch(
      /\.language summary \{[^}]*background: var\(--sp-surface\);/,
    );
  });
});
