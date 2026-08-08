import assert from 'node:assert/strict';
import test from 'node:test';
import { composeReport, parseSpecs, reportMarker } from './review.mjs';

test('parses named spec paths', () => {
  assert.deepEqual(parseSpecs('Admin=reference/admin.yml\nMulti=reference/multi.yml\n'), [
    { name: 'Admin', path: 'reference/admin.yml' },
    { name: 'Multi', path: 'reference/multi.yml' },
  ]);
});

test('rejects malformed spec entries', () => {
  assert.throws(() => parseSpecs('reference/openapi.yml'), /Use name=path/);
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
