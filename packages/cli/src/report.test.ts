import { describe, expect, it } from 'vitest';
import { diffSpecs } from 'speccy-core';
import type { ApiDiagnostic, DiffReport, OpenAPIDocument } from 'speccy-core';
import {
  COMMENT_MARKER,
  diffExitCode,
  formatDiff,
  formatLint,
  lintExitCode,
} from './report';

const base: OpenAPIDocument = {
  openapi: '3.1.0',
  info: { title: 'Lending', version: '1.0.0' },
  paths: {
    '/loans': {
      get: {
        operationId: 'listLoans',
        tags: ['Loans'],
        summary: 'List loans',
        responses: { '200': { description: 'OK' } },
      },
      post: {
        operationId: 'createLoan',
        tags: ['Loans'],
        summary: 'Create a loan',
        responses: { '201': { description: 'Created' } },
      },
    },
  },
};

const revision: OpenAPIDocument = {
  openapi: '3.1.0',
  info: { title: 'Lending', version: '2.0.0' },
  paths: {
    '/loans': {
      get: {
        operationId: 'listLoans',
        tags: ['Loans'],
        summary: 'List every loan',
        responses: { '200': { description: 'OK' } },
        parameters: [{ name: 'tenant', in: 'query', required: true }],
      },
    },
  },
};

const report: DiffReport = diffSpecs(base, revision);

const diagnostics: ApiDiagnostic[] = [
  {
    id: 'a',
    ruleId: 'operation-id',
    source: 'speccy',
    severity: 'issue',
    category: 'oas',
    message: 'GET /loans has no operationId.',
    path: ['paths', '/loans', 'get'],
  },
  {
    id: 'b',
    ruleId: 'error-response',
    source: 'speccy',
    severity: 'warning',
    category: 'errors',
    message: 'No error response is documented.',
    path: ['paths', '/loans', 'get'],
    suggestion: 'Add the likely 4xx responses.',
  },
  {
    id: 'c',
    ruleId: 'tag-description',
    source: 'speccy',
    severity: 'suggestion',
    category: 'documentation',
    message: 'Loans has no description.',
    path: ['tags', 0],
  },
];

describe('formatDiff', () => {
  it('returns the report verbatim as JSON', () => {
    expect(JSON.parse(formatDiff(report, 'json'))).toEqual(
      JSON.parse(JSON.stringify(report)),
    );
  });

  it('leads the markdown with the merge verdict and severity totals', () => {
    const markdown = formatDiff(report, 'markdown');

    expect(markdown.split('\n')[0]).toBe(COMMENT_MARKER);
    expect(markdown).toContain('### ❌ API compatibility check failed');
    expect(markdown).toContain('**2 breaking · 0 warning');
    expect(markdown).toContain('Lending 1.0.0');
    expect(markdown).toContain('2.0.0');
  });

  it('shows operation, area, and OpenAPI location details', () => {
    const markdown = formatDiff(report, 'markdown');

    expect(markdown).toContain('| Impact | Operation | Area | Change |');
    expect(markdown).toContain('`POST /loans`');
    expect(markdown).toContain('OpenAPI location: `paths › /loans › post`');
  });

  it('says so plainly when nothing changed', () => {
    const markdown = formatDiff(diffSpecs(base, base), 'markdown');

    expect(markdown).toContain('No API changes');
    expect(markdown).not.toContain('<details>');
  });

  it('shows source refs when the host supplies them', () => {
    const sourced = diffSpecs(base, revision, {
      base: { source: 'origin/main:openapi.yaml' },
      revision: { source: 'openapi.yaml' },
    });

    expect(formatDiff(sourced, 'markdown')).toContain(
      '`origin/main:openapi.yaml` → `openapi.yaml`',
    );
  });

  it('names the operations a shared component change reaches', () => {
    const shared = diffSpecs(
      {
        openapi: '3.1.0',
        info: { title: 'A', version: '1' },
        paths: {
          '/a': {
            get: {
              operationId: 'getA',
              responses: {
                '200': {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/E' },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            E: { type: 'object', properties: { code: { type: 'string' } } },
          },
        },
      },
      {
        openapi: '3.1.0',
        info: { title: 'A', version: '2' },
        paths: {
          '/a': {
            get: {
              operationId: 'getA',
              responses: {
                '200': {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/E' },
                    },
                  },
                },
              },
            },
          },
        },
        components: { schemas: { E: { type: 'object', properties: {} } } },
      },
    );

    expect(formatDiff(shared, 'markdown')).toContain('getA');
  });

  it('does not repeat the operation when the message already names it', () => {
    expect(formatDiff(report, 'pretty', { color: false })).toContain(
      'POST /loans was removed.',
    );
    expect(formatDiff(report, 'pretty', { color: false })).not.toContain(
      'POST /loans — POST /loans',
    );
  });

  it('renders plain text without markup for the terminal', () => {
    const pretty = formatDiff(report, 'pretty', { color: false });

    expect(pretty).toContain('2 breaking');
    expect(pretty).not.toContain('<details>');
    expect(pretty).not.toContain('[');
  });
});

describe('formatLint', () => {
  it('returns diagnostics verbatim as JSON', () => {
    expect(JSON.parse(formatLint(diagnostics, 'json'))).toEqual(diagnostics);
  });

  it('counts each severity in the markdown headline', () => {
    const markdown = formatLint(diagnostics, 'markdown');

    expect(markdown.split('\n')[0]).toBe(COMMENT_MARKER);
    expect(markdown).toMatch(/API health: 1 issue, 1 warning, 1 suggestion/);
    expect(markdown).toContain('advisory');
  });

  it('reports a clean document without a findings table', () => {
    expect(formatLint([], 'markdown')).toContain('No problems found');
  });

  it('includes the suggestion when a rule offers one', () => {
    expect(formatLint(diagnostics, 'pretty', { color: false })).toContain(
      'Add the likely 4xx responses.',
    );
  });

  it('uses the rule ID when a diagnostic has no OpenAPI path', () => {
    const diagnostic = { ...diagnostics[0]!, operationId: undefined, path: [] };

    expect(formatLint([diagnostic], 'pretty', { color: false })).toContain(
      'operation-id operation-id',
    );
  });
});

describe('exit codes', () => {
  it('fails a diff only at or above the requested severity', () => {
    expect(diffExitCode(report, 'breaking')).toBe(1);
    expect(diffExitCode(report, 'never')).toBe(0);
    expect(diffExitCode(diffSpecs(base, base), 'breaking')).toBe(0);
  });

  it('treats warnings as passing when the threshold is breaking', () => {
    const warned: DiffReport = {
      base: {},
      revision: {},
      changes: [
        {
          id: 'x:y',
          severity: 'warning',
          kind: 'changed',
          location: ['y'],
          message: 'Something shifted.',
        },
      ],
    };

    expect(diffExitCode(warned, 'breaking')).toBe(0);
    expect(diffExitCode(warned, 'warning')).toBe(1);
  });

  it('fails a lint at or above the requested severity', () => {
    expect(lintExitCode(diagnostics, 'issue')).toBe(1);
    expect(lintExitCode(diagnostics, 'never')).toBe(0);
    expect(lintExitCode(diagnostics.slice(2), 'issue')).toBe(0);
    expect(lintExitCode(diagnostics.slice(2), 'suggestion')).toBe(1);
  });
});
