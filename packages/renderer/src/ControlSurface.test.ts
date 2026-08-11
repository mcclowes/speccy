import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('request control surfaces', () => {
  it('uses the raised surface for request example and language selectors', () => {
    const exampleSelectStyles = readFileSync(
      'src/ExampleSelect.module.css',
      'utf8',
    );
    const requestSampleStyles = readFileSync(
      'src/RequestSample.module.css',
      'utf8',
    );

    expect(exampleSelectStyles).toMatch(
      /:global\(\.sp-request-example\) \.select \{[^}]*background: var\(--sp-surface\);/,
    );
    expect(requestSampleStyles).toMatch(
      /\.language summary \{[^}]*background: var\(--sp-surface\);/,
    );
  });

  it('uses a compact trigger and page surface for optional parameters', () => {
    const operationStyles = readFileSync(
      'src/OperationDetails.module.css',
      'utf8',
    );

    expect(operationStyles).toMatch(
      /\.addOptionalParameter \{[^}]*500 0\.6875rem Manrope,/,
    );
    expect(operationStyles).toMatch(
      /\.optionalParameterMenu \{[^}]*background: var\(--sp-bg\);/,
    );
    expect(operationStyles).toMatch(
      /\.optionalParameterMenu > input \{[^}]*background: var\(--sp-bg\);/,
    );
  });
});
