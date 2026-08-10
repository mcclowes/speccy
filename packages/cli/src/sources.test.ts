import { describe, expect, it, vi } from 'vitest';
import {
  MissingRefError,
  MissingSpecError,
  readSource,
  resolveSourceKind,
} from './sources';

function io(overrides: Partial<Parameters<typeof readSource>[1]> = {}) {
  return {
    readFile: vi.fn(async () => 'openapi: 3.1.0'),
    exists: vi.fn(async () => true),
    git: vi.fn(async () => 'openapi: 3.1.0'),
    fetch: vi.fn(async () => 'openapi: 3.1.0'),
    ...overrides,
  };
}

describe('resolveSourceKind', () => {
  it('treats http and https as URLs', async () => {
    await expect(
      resolveSourceKind('https://example.com/openapi.yaml', async () => false),
    ).resolves.toBe('url');
    await expect(
      resolveSourceKind('http://example.com/openapi.yaml', async () => false),
    ).resolves.toBe('url');
  });

  it('prefers a file that exists on disk, even when it contains a colon', async () => {
    await expect(
      resolveSourceKind('main:openapi.yaml', async () => true),
    ).resolves.toBe('file');
  });

  it('treats ref:path as git when no such file exists', async () => {
    await expect(
      resolveSourceKind('main:openapi.yaml', async () => false),
    ).resolves.toBe('git');
    await expect(
      resolveSourceKind('origin/main:api/openapi.yaml', async () => false),
    ).resolves.toBe('git');
  });

  it('treats a plain path as a file', async () => {
    await expect(
      resolveSourceKind('./openapi.yaml', async () => false),
    ).resolves.toBe('file');
  });
});

describe('readSource', () => {
  it('reads a file from disk', async () => {
    const deps = io();
    await expect(readSource('openapi.yaml', deps)).resolves.toBe(
      'openapi: 3.1.0',
    );
    expect(deps.readFile).toHaveBeenCalledWith('openapi.yaml');
  });

  it('reads a URL over the network', async () => {
    const deps = io({ exists: vi.fn(async () => false) });
    await expect(
      readSource('https://example.com/openapi.yaml', deps),
    ).resolves.toBe('openapi: 3.1.0');
    expect(deps.fetch).toHaveBeenCalledWith('https://example.com/openapi.yaml');
  });

  it('reads a git ref', async () => {
    const deps = io({ exists: vi.fn(async () => false) });
    await expect(readSource('main:openapi.yaml', deps)).resolves.toBe(
      'openapi: 3.1.0',
    );
    expect(deps.git).toHaveBeenCalledWith('main', 'openapi.yaml');
  });

  it('reports a missing file rather than guessing', async () => {
    const deps = io({ exists: vi.fn(async () => false) });
    await expect(readSource('openapi.yaml', deps)).rejects.toBeInstanceOf(
      MissingSpecError,
    );
  });

  it('returns undefined when the ref exists but the file is new in this branch', async () => {
    const deps = io({
      exists: vi.fn(async () => false),
      git: vi.fn(async () => undefined),
    });
    await expect(
      readSource('main:openapi.yaml', deps),
    ).resolves.toBeUndefined();
  });

  it('explains how to fix a shallow clone when the ref itself is unreachable', async () => {
    const deps = io({
      exists: vi.fn(async () => false),
      git: vi.fn(async () => {
        throw new MissingRefError('main');
      }),
    });

    await expect(readSource('main:openapi.yaml', deps)).rejects.toThrow(
      /fetch-depth: 0/,
    );
  });
});
