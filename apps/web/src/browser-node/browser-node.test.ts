import { describe, expect, it, vi } from 'vitest';
import { Buffer } from './buffer';
import { readFile } from './fs';
import { sep } from './path';

describe('Spectral browser Node adapters', () => {
  it('represents YAML binary values as byte arrays', () => {
    const value = new Buffer([0x53, 0x70, 0x65, 0x63, 0x63, 0x79]);

    expect(Buffer.isBuffer(value)).toBe(true);
    expect(Array.from(value)).toEqual([0x53, 0x70, 0x65, 0x63, 0x63, 0x79]);
  });

  it('uses browser path separators', () => {
    expect(sep).toBe('/');
  });

  it('rejects filesystem reads with a clear error', () => {
    const callback = vi.fn();

    readFile('/tmp/openapi.yaml', 'utf8', callback);

    expect(callback).toHaveBeenCalledWith(
      new Error('Filesystem references are unavailable in the browser.'),
    );
  });
});
