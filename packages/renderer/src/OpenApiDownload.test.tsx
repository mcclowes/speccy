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
    const createObjectURL = vi.fn<(value: Blob) => string>(() => 'blob:openapi');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const document = { openapi: '3.1.0', info: { title: 'Catalog API' }, paths: {} };

    render(<OpenApiDownload document={document} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(filename) }));

    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe(contentType);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:openapi');
  });
});
