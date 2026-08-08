import assert from 'node:assert/strict';
import test from 'node:test';
import { composeReport, parseSpecs, reportMarker } from './review.mjs';

test('parses named source and generated spec paths', () => {
  assert.deepEqual(parseSpecs('Admin=reference/admin.yml\nMulti=.base/multi.yml => _build/multi.yml\n'), [
    { name: 'Admin', revisionPath: 'reference/admin.yml' },
    { name: 'Multi', basePath: '.base/multi.yml', revisionPath: '_build/multi.yml' },
  ]);
});

test('rejects malformed spec entries', () => {
  assert.throws(() => parseSpecs('reference/openapi.yml'), /Use name=path/);
  assert.throws(() => parseSpecs('Admin=base.yml=>'), /base-path=>revision-path/);
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
