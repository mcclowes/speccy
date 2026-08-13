import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { composeReport, parseSpecs, reportMarker, runCli } from './review.mjs';

test('parses named source and generated spec paths', () => {
  assert.deepEqual(
    parseSpecs(
      'Admin=reference/admin.yml\nMulti=.base/multi.yml => _build/multi.yml\n',
    ),
    [
      { name: 'Admin', revisionPath: 'reference/admin.yml' },
      {
        name: 'Multi',
        basePath: '.base/multi.yml',
        revisionPath: '_build/multi.yml',
      },
    ],
  );
});

test('rejects malformed spec entries', () => {
  assert.throws(() => parseSpecs('reference/openapi.yml'), /Use name=path/);
  assert.throws(
    () => parseSpecs('Admin=base.yml=>'),
    /base-path=>revision-path/,
  );
  assert.throws(() => parseSpecs('  \n'), /At least one spec/);
});

test('composes one marked report for all specs', () => {
  const report = composeReport([
    { name: 'Admin', diff: 'No changes.\n', health: 'One warning.\n' },
    { name: 'Multi', diff: 'One change.\n', health: 'Healthy.\n' },
  ]);
  assert.ok(report.startsWith(reportMarker));
  assert.match(report, /### Admin\n\nNo changes\.\n\nOne warning\./);
  assert.match(report, /### Multi\n\nOne change\.\n\nHealthy\./);
});

test('captures CLI output larger than the spawnSync default buffer', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'speccy-action-'));
  const executable = path.join(directory, 'npx');
  const originalPath = process.env.PATH;
  await writeFile(
    executable,
    `#!/usr/bin/env node\nprocess.stdout.write('x'.repeat(1024 * 1024 + 1));\n`,
  );
  await chmod(executable, 0o755);

  try {
    process.env.PATH = `${directory}${path.delimiter}${originalPath}`;
    const result = runCli([], 'test');
    assert.equal(result.output.length, 1024 * 1024 + 1);
    assert.equal(result.status, 0);
  } finally {
    process.env.PATH = originalPath;
    await rm(directory, { force: true, recursive: true });
  }
});
