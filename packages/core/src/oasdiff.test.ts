import { describe, expect, it } from 'vitest';
import { adaptOasdiffChangelog } from './oasdiff';

describe('adaptOasdiffChangelog', () => {
  it('maps oasdiff findings into a renderable report', () => {
    const report = adaptOasdiffChangelog(
      [
        {
          id: 'request-parameter-became-required',
          text: 'the request parameter status became required',
          level: 'ERR',
          operation: 'GET',
          operationId: 'listLoans',
          path: '/loans',
          section: 'parameters',
          fingerprint: 'abc123',
          baseSource: { file: 'base.yaml', line: 20, column: 7 },
          revisionSource: { file: 'revision.yaml', line: 22, column: 7 },
        },
      ],
      {
        base: { version: '1.0.0' },
        revision: { version: '2.0.0' },
        operationMetadata: () => ({ tag: 'Loans' }),
      },
    );

    expect(report.changes[0]).toMatchObject({
      id: 'abc123',
      severity: 'breaking',
      kind: 'changed',
      method: 'get',
      path: '/loans',
      tag: 'Loans',
      scope: { area: 'parameters' },
      location: ['paths', '/loans', 'get', 'parameters'],
      source: { base: { source: 'base.yaml', line: 20, column: 7 } },
    });
  });

  it('maps documentation changes and rejects unknown levels', () => {
    expect(
      adaptOasdiffChangelog([
        {
          id: 'api-description-updated',
          text: 'description changed',
          level: 'INFO',
          section: 'description',
        },
      ]).changes[0],
    ).toMatchObject({
      severity: 'documentation',
      scope: { area: 'documentation' },
    });
    expect(() =>
      adaptOasdiffChangelog([{ id: 'x', text: 'x', level: 'FATAL' }]),
    ).toThrow('Unsupported oasdiff level');
  });
});
