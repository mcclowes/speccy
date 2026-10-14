import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
    const packageJson = JSON.parse(
      await readFile(join(target, 'package.json'), 'utf8'),
    );
    assert.equal(packageJson.name, 'payments-api');
    const starter = JSON.parse(
      await readFile(new URL('./package.json', import.meta.url), 'utf8'),
    );
    const renderer = JSON.parse(
      await readFile(
        new URL('../renderer/package.json', import.meta.url),
        'utf8',
      ),
    );
    assert.equal(starter.version, renderer.version);
    assert.equal(
      packageJson.dependencies['speccy-renderer'],
      `^${starter.version}`,
    );
    assert.match(
      await readFile(join(target, 'speccy.config.ts'), 'utf8'),
      /openapi\.yaml/,
    );
    assert.match(
      await readFile(join(target, 'src', 'App.tsx'), 'utf8'),
      /<Speccy/,
    );
    assert.match(await readFile(join(target, '.gitignore'), 'utf8'), /dist\//);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('uses the starter release version even when its copied template is stale', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'speccy future release '));
  try {
    const published = join(parent, 'starter');
    await mkdir(published);
    await cp(
      new URL('./index.js', import.meta.url),
      join(published, 'index.js'),
    );
    await cp(
      new URL('./template', import.meta.url),
      join(published, 'template'),
      {
        recursive: true,
        filter: (source) =>
          !['node_modules', 'dist'].includes(basename(source)),
      },
    );
    const templatePath = join(published, 'template/package.json');
    const template = JSON.parse(await readFile(templatePath, 'utf8'));
    template.dependencies['speccy-renderer'] = '^0.1.0';
    await writeFile(templatePath, JSON.stringify(template));
    const metadata = JSON.parse(
      await readFile(new URL('./package.json', import.meta.url), 'utf8'),
    );
    metadata.version = '0.15.0';
    await writeFile(join(published, 'package.json'), JSON.stringify(metadata));
    const { createReference: createFutureReference } = await import(
      pathToFileURL(join(published, 'index.js')).href
    );
    const target = join(parent, 'Next API Reference');
    await createFutureReference(target);
    const generated = JSON.parse(
      await readFile(join(target, 'package.json'), 'utf8'),
    );
    assert.equal(generated.dependencies['speccy-renderer'], '^0.15.0');
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('accepts the inherit theme in the generated virtual module types', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'speccy theme types '));
  try {
    const fixture = join(directory, 'inherit.ts');
    await writeFile(
      fixture,
      "import { config } from 'virtual:speccy-reference';\nconst theme: typeof config.theme = 'inherit';\nvoid theme;\n",
    );
    execFileSync(
      process.execPath,
      [
        fileURLToPath(
          new URL('../../node_modules/typescript/bin/tsc', import.meta.url),
        ),
        '--noEmit',
        '--strict',
        '--skipLibCheck',
        '--target',
        'ES2022',
        '--module',
        'ESNext',
        '--moduleResolution',
        'Bundler',
        fileURLToPath(new URL('./template/src/virtual.d.ts', import.meta.url)),
        fixture,
      ],
      { timeout: 60_000, stdio: 'pipe' },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
