import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  composeReport,
  fitReport,
  parseSpecs,
  reportMarker,
  review,
  runCli,
} from './review.mjs';

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

test('lints each revision against its base document', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'speccy-action-'));
  const executable = path.join(directory, 'npx');
  const capture = path.join(directory, 'arguments.jsonl');
  const originalPath = process.env.PATH;
  const originalCapture = process.env.SPECCY_TEST_CAPTURE;
  await writeFile(
    executable,
    `#!/usr/bin/env node\nconst fs = require('node:fs');\nfs.appendFileSync(process.env.SPECCY_TEST_CAPTURE, JSON.stringify(process.argv.slice(2)) + '\\n');\nprocess.stdout.write('OK\\n');\n`,
  );
  await chmod(executable, 0o755);

  try {
    process.env.PATH = `${directory}${path.delimiter}${originalPath}`;
    process.env.SPECCY_TEST_CAPTURE = capture;
    await review({
      specs: [{ name: 'Public', revisionPath: 'openapi.yaml' }],
      version: 'test',
      baseRef: 'origin/main',
      failOn: 'breaking',
      healthFailOn: 'never',
    });

    const calls = (await readFile(capture, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    assert.deepEqual(calls[1].slice(2, 7), [
      'lint',
      'openapi.yaml',
      '--against',
      'origin/main:openapi.yaml',
      '--format',
    ]);
  } finally {
    process.env.PATH = originalPath;
    if (originalCapture === undefined) delete process.env.SPECCY_TEST_CAPTURE;
    else process.env.SPECCY_TEST_CAPTURE = originalCapture;
    await rm(directory, { force: true, recursive: true });
  }
});

test('leaves reports within the limit untouched', () => {
  const report = composeReport([
    { name: 'Admin', diff: 'No changes.\n', health: 'Healthy.\n' },
  ]);
  assert.equal(fitReport(report, 1000, 'https://example.test/run'), report);
});

test('truncates oversized reports on a line boundary with a link to the run', () => {
  const rows = Array.from({ length: 200 }, (_, i) => `| row ${i} | ✓ |`).join(
    '\n',
  );
  const report = composeReport([{ name: 'Admin', diff: rows, health: 'ok' }]);
  const fitted = fitReport(report, 2000, 'https://example.test/run');
  assert.ok(Buffer.byteLength(fitted) <= 2000);
  assert.ok(fitted.startsWith(reportMarker));
  assert.match(fitted, /\| row \d+ \| ✓ \|\n\n_Report truncated/);
  assert.match(fitted, /\[full report\]\(https:\/\/example\.test\/run\)/);
});

test('closes details blocks cut open by truncation', () => {
  const body = ['<details>', '<summary>More</summary>', '']
    .concat(Array.from({ length: 200 }, (_, i) => `line ${i}`))
    .concat(['', '</details>'])
    .join('\n');
  const report = composeReport([{ name: 'Admin', diff: body, health: 'ok' }]);
  const fitted = fitReport(report, 1000);
  assert.ok(Buffer.byteLength(fitted) <= 1000);
  assert.equal(fitted.match(/<details>/g).length, 1);
  assert.equal(fitted.match(/<\/details>/g).length, 1);
  assert.match(fitted, /<\/details>\n\n_Report truncated\._\n$/);
});
