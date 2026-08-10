import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

test('packs global and component styles in the public stylesheet', () => {
  const css = readFileSync('dist/styles.css', 'utf8');
  const javascript = readFileSync('dist/index.js', 'utf8');

  assert.match(css, /\.speccy \{/);
  assert.match(css, /\.OperationDetails_optionalParameterDocs \{/);
  assert.match(css, /\.OpenApiDownload_card \{/);
  assert.match(css, /\.RequestSample_sample \{/);
  assert.match(
    javascript,
    /optionalParameterDocs: "OperationDetails_optionalParameterDocs"/,
  );

  const cache = mkdtempSync(join(tmpdir(), 'speccy-npm-cache-'));
  try {
    const [{ files }] = JSON.parse(
      execFileSync('npm', ['pack', '--dry-run', '--json', '--cache', cache], {
        encoding: 'utf8',
      }),
    );
    assert.ok(files.some(({ path }) => path === 'dist/styles.css'));
    assert.ok(!files.some(({ path }) => path === 'dist/index.css'));
  } finally {
    rmSync(cache, { force: true, recursive: true });
  }
});
