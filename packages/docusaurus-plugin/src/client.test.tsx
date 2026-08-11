import { describe, expect, it } from 'vitest';
import { OpenAPI } from './client';

const spec = { openapi: '3.1.0', info: { title: 'Test API', version: '1' } };

describe('OpenAPI', () => {
  it('inherits Docusaurus theme and typography by default', () => {
    const element = OpenAPI({ spec });

    expect(element.props).toMatchObject({
      className: 'sp-docusaurus',
      showSidebar: false,
      showThemeToggle: false,
      theme: 'inherit',
    });
  });

  it('allows renderer theme defaults to be overridden', () => {
    const element = OpenAPI({
      spec,
      className: 'custom-reference',
      showThemeToggle: true,
      theme: 'dark',
    });

    expect(element.props).toMatchObject({
      className: 'sp-docusaurus custom-reference',
      showThemeToggle: true,
      theme: 'dark',
    });
  });

  it('forwards the try-it opt-out to the shared renderer', () => {
    const element = OpenAPI({ spec, tryIt: false });

    expect(element.props.tryIt).toBe(false);
  });
});
