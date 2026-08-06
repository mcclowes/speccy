import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { loadSpec, normalizeRoute } from './index';

describe('normalizeRoute', () => {
  it('adds a leading slash and strips trailing slashes', () => {
    expect(normalizeRoute('reference/')).toBe('/reference');
    expect(normalizeRoute('/')).toBe('/');
  });
});

describe('loadSpec', () => {
  it('reads relative spec paths from the site directory', async () => {
    const siteDir = await mkdtemp(join(tmpdir(), 'speccy-'));
    await writeFile(join(siteDir, 'openapi.yaml'), 'openapi: 3.1.0');

    await expect(loadSpec({ spec: 'openapi.yaml' }, siteDir)).resolves.toBe('openapi: 3.1.0');
  });

  it('returns inline documents without changing them', async () => {
    const spec = { openapi: '3.1.0' };
    await expect(loadSpec({ spec }, '/tmp')).resolves.toBe(spec);
  });

  it('reports a missing source clearly', async () => {
    await expect(loadSpec({}, '/tmp')).rejects.toThrow('needs either spec');
  });
});

