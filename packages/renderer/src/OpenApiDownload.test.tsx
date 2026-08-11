import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenApiDownload } from './OpenApiDownload';

describe('OpenApiDownload', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    ['JSON', 'openapi.json', 'application/json'],
    ['YAML', 'openapi.yaml', 'application/yaml'],
  ])('downloads the document as %s', (_label, filename, contentType) => {
    const createObjectURL = vi.fn<(value: Blob) => string>(
      () => 'blob:openapi',
    );
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL, revokeObjectURL }),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const document = {
      openapi: '3.1.0',
      info: { title: 'Catalog API' },
      paths: {},
    };

    render(<OpenApiDownload document={document} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(filename) }));

    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe(contentType);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:openapi');
  });

  it('links to a public description and copies its URL', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <OpenApiDownload
        document={{ openapi: '3.1.0', paths: {} }}
        openApiUrl="https://api.example.com/openapi.yaml"
      />,
    );

    expect(
      screen.getByRole('link', { name: /open openapi description/i }),
    ).toHaveAttribute('href', 'https://api.example.com/openapi.yaml');
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith(
      'https://api.example.com/openapi.yaml',
    );
  });

  it('links to a configured Postman collection', () => {
    render(
      <OpenApiDownload
        document={{ openapi: '3.1.0', paths: {} }}
        postmanCollectionUrl="https://www.postman.com/example/collection"
      />,
    );

    expect(
      screen.getByRole('link', { name: /run in postman/i }),
    ).toHaveAttribute('href', 'https://www.postman.com/example/collection');
  });
});
