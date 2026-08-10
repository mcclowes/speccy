import { describe, expect, it } from 'vitest';
import { run } from './run';
import type { SourceIO } from './sources';

const BASE = `
openapi: 3.1.0
info: {title: Lending, version: 1.0.0}
paths:
  /loans:
    get:
      operationId: listLoans
      summary: List loans
      description: Returns every loan.
      responses: {"200": {description: OK}, "400": {description: Bad request}}
    post:
      operationId: createLoan
      summary: Create a loan
      description: Records a new loan.
      responses: {"201": {description: Created}, "400": {description: Bad request}}
`;

const REVISION = BASE.replace(/ {4}post:[\s\S]*$/, '');

function harness(files: Record<string, string | undefined> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const io: SourceIO = {
    readFile: async (path) => files[path] ?? '',
    exists: async (path) => path in files,
    git: async (ref, path) => files[`${ref}:${path}`],
    fetch: async (url) => files[url] ?? '',
  };
  return {
    out,
    err,
    io,
    write: (line: string) => out.push(line),
    writeError: (line: string) => err.push(line),
  };
}

describe('run', () => {
  it('prints usage and succeeds for --help', async () => {
    const h = harness();
    await expect(run(['--help'], h)).resolves.toBe(0);
    expect(h.out.join('\n')).toContain('speccy lint');
  });

  it('rejects an unknown command with the tool failure code', async () => {
    const h = harness();
    await expect(run(['explode', 'a.yaml'], h)).resolves.toBe(2);
    expect(h.err.join('\n')).toContain('explode');
  });

  it('lints a document and reports findings', async () => {
    const h = harness({ 'openapi.yaml': BASE });
    const code = await run(['lint', 'openapi.yaml', '--format', 'json'], h);

    expect(code).toBe(0);
    expect(JSON.parse(h.out.join(''))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: expect.any(String) }),
      ]),
    );
  });

  it('fails the lint when findings reach the threshold', async () => {
    const h = harness({ 'openapi.yaml': BASE });
    await expect(
      run(['lint', 'openapi.yaml', '--fail-on', 'suggestion'], h),
    ).resolves.toBe(1);
  });

  it('diffs two documents and fails on a breaking change', async () => {
    const h = harness({ 'base.yaml': BASE, 'head.yaml': REVISION });
    const code = await run(['diff', 'base.yaml', 'head.yaml'], h);

    expect(code).toBe(1);
    expect(h.out.join('\n')).toContain('POST /loans was removed.');
  });

  it('passes when the diff has no breaking changes', async () => {
    const h = harness({ 'base.yaml': BASE, 'head.yaml': BASE });
    await expect(run(['diff', 'base.yaml', 'head.yaml'], h)).resolves.toBe(0);
  });

  it('reads a base from a git ref', async () => {
    const h = harness({ 'main:openapi.yaml': BASE, 'openapi.yaml': REVISION });
    await expect(
      run(['diff', 'main:openapi.yaml', 'openapi.yaml'], h),
    ).resolves.toBe(1);
  });

  it('exits clean when the spec is new and has no base to compare', async () => {
    const h = harness({ 'openapi.yaml': BASE });
    const code = await run(['diff', 'main:openapi.yaml', 'openapi.yaml'], h);

    expect(code).toBe(0);
    expect(h.out.join('\n')).toMatch(/no base|new/i);
  });

  it('separates a broken spec from a spec with breaking changes', async () => {
    const h = harness({ 'openapi.yaml': 'this: [is not: valid' });
    await expect(run(['lint', 'openapi.yaml'], h)).resolves.toBe(2);
  });

  it('reports a missing file as a tool failure', async () => {
    const h = harness();
    const code = await run(['lint', 'nope.yaml'], h);

    expect(code).toBe(2);
    expect(h.err.join('\n')).toContain('nope.yaml');
  });

  it('rejects an unsupported format', async () => {
    const h = harness({ 'openapi.yaml': BASE });
    await expect(
      run(['lint', 'openapi.yaml', '--format', 'xml'], h),
    ).resolves.toBe(2);
  });

  it('adds change-safety findings to a lint when given a previous document', async () => {
    const h = harness({ 'base.yaml': BASE, 'head.yaml': REVISION });
    const code = await run(
      ['lint', 'head.yaml', '--against', 'base.yaml', '--format', 'json'],
      h,
    );
    const findings = JSON.parse(h.out.join('')) as Array<{
      category: string;
      ruleId: string;
    }>;

    // The removed operation is an issue, and lint fails on issues by default.
    expect(code).toBe(1);
    expect(
      findings.some(
        (finding) =>
          finding.category === 'change-safety' &&
          finding.ruleId === 'operation-removed',
      ),
    ).toBe(true);
  });

  it('writes markdown ready to post as a comment', async () => {
    const h = harness({ 'base.yaml': BASE, 'head.yaml': REVISION });
    await run(['diff', 'base.yaml', 'head.yaml', '--format', 'markdown'], h);

    expect(h.out.join('\n').split('\n')[0]).toBe('<!-- speccy-report -->');
  });
});
