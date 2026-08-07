import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createReference, packageNameFor } from './index.js';

test('turns the destination into a valid package name', () => {
  assert.equal(packageNameFor('/tmp/My API Reference'), 'my-api-reference');
});

test('creates a complete standalone project', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'speccy-reference-'));
  const target = join(parent, 'Payments API');

  try {
    await createReference(target);
    const packageJson = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
    assert.equal(packageJson.name, 'payments-api');
    assert.match(await readFile(join(target, 'speccy.config.ts'), 'utf8'), /openapi\.yaml/);
    assert.match(await readFile(join(target, 'src', 'App.tsx'), 'utf8'), /<Speccy/);
    assert.match(await readFile(join(target, '.gitignore'), 'utf8'), /dist\//);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});
