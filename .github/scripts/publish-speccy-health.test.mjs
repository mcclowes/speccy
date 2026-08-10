import assert from 'node:assert/strict';
import test from 'node:test';
import { LineCounter, parseDocument } from 'yaml';
import {
  addedLines,
  commentFor,
  diagnosticLine,
} from './publish-speccy-health.mjs';

test('finds added revision lines in a unified patch', () => {
  const patch = '@@ -2,2 +2,4 @@\n context\n+first\n+second\n context';
  assert.deepEqual([...addedLines(patch)], [3, 4]);
});

test('maps an OpenAPI path to its YAML line', () => {
  const source =
    'components:\n  schemas:\n    Card:\n      properties:\n        status:\n          type: string\n';
  const lineCounter = new LineCounter();
  const document = parseDocument(source, { lineCounter });
  assert.equal(
    diagnosticLine(document, lineCounter, [
      'components',
      'schemas',
      'Card',
      'properties',
      'status',
    ]),
    6,
  );
});

test('groups health findings into one marked review comment', () => {
  const body = commentFor('openapi.yaml', 5, [
    {
      ruleId: 'enum-values-documented',
      severity: 'suggestion',
      message: 'Values need descriptions.',
    },
    {
      ruleId: 'property-description',
      severity: 'suggestion',
      message: 'status has no description.',
      suggestion: 'Describe it.',
    },
  ]);
  assert.match(body, /^<!-- speccy-health:openapi.yaml:5 -->/);
  assert.match(body, /API health: 2 suggestions/);
  assert.match(body, /Describe it\./);
});
