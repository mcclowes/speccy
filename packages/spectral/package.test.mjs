import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('runs the standard OAS ruleset through the CommonJS export', async () => {
  const { runSpectral } = require('./dist/index.cjs');
  const diagnostics = await runSpectral(
    'openapi: 3.1.0\ninfo:\n  title: Bare API\n  version: "1"\npaths: {}',
  );

  assert.ok(
    diagnostics.some((diagnostic) => diagnostic.code === 'info-description'),
  );
});
