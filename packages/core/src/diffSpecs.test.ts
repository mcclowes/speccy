import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffSpecs } from './diffSpecs';
import { parseSpec } from './model';
import type { ApiChange, DiffReport } from './diff';
import type { OpenAPIDocument, SchemaObject } from './types';

function document(paths: OpenAPIDocument['paths'], rest: Partial<OpenAPIDocument> = {}): OpenAPIDocument {
  return { openapi: '3.1.0', info: { title: 'Lending', version: '1.0.0' }, paths, ...rest };
}

function operation(overrides: Record<string, unknown> = {}) {
  return { operationId: 'listLoans', summary: 'List loans', responses: { '200': { description: 'OK' } }, ...overrides };
}

function jsonBody(schema: SchemaObject) {
  return { content: { 'application/json': { schema } } };
}

function find(report: DiffReport, ruleId: string): ApiChange[] {
  return report.changes.filter((change) => change.id.startsWith(`${ruleId}:`));
}

function ruleIds(report: DiffReport): string[] {
  return report.changes.map((change) => change.id.slice(0, change.id.indexOf(':')));
}

describe('diffSpecs', () => {
  it('reports nothing for identical documents', () => {
    const spec = document({ '/loans': { get: operation() } });
    expect(diffSpecs(spec, spec).changes).toEqual([]);
  });

  it('carries title and version for both sides', () => {
    const base = document({}, { info: { title: 'Lending', version: '1.0.0' } });
    const revision = document({}, { info: { title: 'Lending', version: '2.0.0' } });
    const report = diffSpecs(base, revision);

    expect(report.base).toMatchObject({ title: 'Lending', version: '1.0.0' });
    expect(report.revision).toMatchObject({ title: 'Lending', version: '2.0.0' });
  });

  it('accepts YAML strings as well as parsed documents', () => {
    const base = 'openapi: 3.1.0\npaths:\n  /loans:\n    get:\n      responses:\n        "200":\n          description: OK\n';
    const revision = 'openapi: 3.1.0\npaths: {}\n';

    expect(find(diffSpecs(base, revision), 'operation-removed')).toHaveLength(1);
  });

  describe('operations', () => {
    it('flags a removed operation as breaking', () => {
      const report = diffSpecs(document({ '/loans': { get: operation() } }), document({}));
      const [change] = find(report, 'operation-removed');

      expect(change).toMatchObject({ severity: 'breaking', kind: 'removed', method: 'get', path: '/loans' });
      expect(change?.message).toContain('GET /loans');
    });

    it('treats an added operation as compatible', () => {
      const report = diffSpecs(document({}), document({ '/loans': { get: operation() } }));

      expect(find(report, 'operation-added')[0]).toMatchObject({ severity: 'compatible', kind: 'added' });
    });

    it('reports a renamed path parameter once rather than as a removal and an addition', () => {
      const base = document({ '/loans/{id}': { get: operation() } });
      const revision = document({ '/loans/{loanId}': { get: operation() } });
      const report = diffSpecs(base, revision);

      expect(find(report, 'path-parameter-renamed')[0]).toMatchObject({ severity: 'breaking' });
      expect(ruleIds(report)).not.toContain('operation-removed');
      expect(ruleIds(report)).not.toContain('operation-added');
    });

    it('flags a newly deprecated operation', () => {
      const base = document({ '/loans': { get: operation() } });
      const revision = document({ '/loans': { get: operation({ deprecated: true }) } });

      expect(find(diffSpecs(base, revision), 'operation-deprecated')[0]).toMatchObject({ kind: 'deprecated', severity: 'warning' });
    });

    it('classifies a changed description as documentation', () => {
      const base = document({ '/loans': { get: operation({ description: 'Lists loans.' }) } });
      const revision = document({ '/loans': { get: operation({ description: 'Lists every loan.' }) } });

      expect(find(diffSpecs(base, revision), 'operation-description-changed')[0]).toMatchObject({ severity: 'documentation' });
    });
  });

  describe('parameters', () => {
    it('flags a newly required parameter as breaking', () => {
      const base = document({ '/loans': { get: operation({ parameters: [{ name: 'status', in: 'query' }] }) } });
      const revision = document({ '/loans': { get: operation({ parameters: [{ name: 'status', in: 'query', required: true }] }) } });

      expect(find(diffSpecs(base, revision), 'required-parameter-added')[0]).toMatchObject({ severity: 'breaking' });
    });

    it('flags a required parameter that did not exist before', () => {
      const base = document({ '/loans': { get: operation() } });
      const revision = document({ '/loans': { get: operation({ parameters: [{ name: 'tenant', in: 'query', required: true }] }) } });

      expect(find(diffSpecs(base, revision), 'required-parameter-added')).toHaveLength(1);
    });

    it('stays quiet when a parameter was already required', () => {
      const spec = document({ '/loans': { get: operation({ parameters: [{ name: 'status', in: 'query', required: true }] }) } });

      expect(diffSpecs(spec, spec).changes).toEqual([]);
    });

    it('treats a removed parameter as breaking', () => {
      const base = document({ '/loans': { get: operation({ parameters: [{ name: 'status', in: 'query' }] }) } });
      const revision = document({ '/loans': { get: operation() } });

      expect(find(diffSpecs(base, revision), 'parameter-removed')[0]).toMatchObject({ severity: 'breaking' });
    });

    it('inherits parameters declared on the path item', () => {
      const base = document({ '/loans': { parameters: [{ name: 'tenant', in: 'query', required: true }], get: operation() } });
      const revision = document({ '/loans': { get: operation({ parameters: [{ name: 'tenant', in: 'query', required: true }] }) } });

      expect(diffSpecs(base, revision).changes).toEqual([]);
    });
  });

  describe('request bodies', () => {
    it('flags a newly required request body as breaking', () => {
      const base = document({ '/loans': { post: operation() } });
      const revision = document({ '/loans': { post: operation({ requestBody: { ...jsonBody({ type: 'object' }), required: true } }) } });

      expect(find(diffSpecs(base, revision), 'request-body-required')[0]).toMatchObject({ severity: 'breaking' });
    });

    it('flags a newly required request field as breaking', () => {
      const base = document({ '/loans': { post: operation({ requestBody: jsonBody({ type: 'object', properties: { amount: { type: 'integer' } } }) }) } });
      const revision = document({ '/loans': { post: operation({ requestBody: jsonBody({ type: 'object', required: ['amount'], properties: { amount: { type: 'integer' } } }) }) } });

      expect(find(diffSpecs(base, revision), 'request-field-required')[0]).toMatchObject({ severity: 'breaking' });
    });

    it('treats a new optional request field as compatible', () => {
      const base = document({ '/loans': { post: operation({ requestBody: jsonBody({ type: 'object', properties: {} }) }) } });
      const revision = document({ '/loans': { post: operation({ requestBody: jsonBody({ type: 'object', properties: { note: { type: 'string' } } }) }) } });

      expect(find(diffSpecs(base, revision), 'request-field-added')[0]).toMatchObject({ severity: 'compatible' });
    });

    it('flags a narrowed request enum as breaking and a widened one as compatible', () => {
      const withValues = (values: string[]) => document({
        '/loans': { post: operation({ requestBody: jsonBody({ type: 'object', properties: { status: { type: 'string', enum: values } } }) }) },
      });

      expect(find(diffSpecs(withValues(['draft', 'open']), withValues(['draft'])), 'request-enum-narrowed')[0]).toMatchObject({ severity: 'breaking' });
      expect(find(diffSpecs(withValues(['draft']), withValues(['draft', 'open'])), 'request-enum-widened')[0]).toMatchObject({ severity: 'compatible' });
    });
  });

  describe('responses', () => {
    it('flags a removed response as breaking and an added one as compatible', () => {
      const base = document({ '/loans': { get: operation({ responses: { '200': { description: 'OK' }, '404': { description: 'Missing' } } }) } });
      const revision = document({ '/loans': { get: operation({ responses: { '200': { description: 'OK' }, '410': { description: 'Gone' } } }) } });
      const report = diffSpecs(base, revision);

      expect(find(report, 'response-removed')[0]).toMatchObject({ severity: 'breaking' });
      expect(find(report, 'response-added')[0]).toMatchObject({ severity: 'compatible' });
    });

    it('flags a removed response field as breaking', () => {
      const base = document({ '/loans': { get: operation({ responses: { '200': { description: 'OK', ...jsonBody({ type: 'object', properties: { id: { type: 'string' }, rate: { type: 'number' } } }) } } }) } });
      const revision = document({ '/loans': { get: operation({ responses: { '200': { description: 'OK', ...jsonBody({ type: 'object', properties: { id: { type: 'string' } } }) } } }) } });

      expect(find(diffSpecs(base, revision), 'response-field-removed')[0]).toMatchObject({ severity: 'breaking' });
    });

    it('treats a new response field as compatible', () => {
      const base = document({ '/loans': { get: operation({ responses: { '200': { description: 'OK', ...jsonBody({ type: 'object', properties: { id: { type: 'string' } } }) } } }) } });
      const revision = document({ '/loans': { get: operation({ responses: { '200': { description: 'OK', ...jsonBody({ type: 'object', properties: { id: { type: 'string' }, rate: { type: 'number' } } }) } } }) } });

      expect(find(diffSpecs(base, revision), 'response-field-added')[0]).toMatchObject({ severity: 'compatible', after: { type: 'number' } });
    });

    it('flags a response field that is no longer guaranteed', () => {
      const schema = (required: string[]): SchemaObject => ({ type: 'object', required, properties: { id: { type: 'string' } } });
      const base = document({ '/loans': { get: operation({ responses: { '200': { description: 'OK', ...jsonBody(schema(['id'])) } } }) } });
      const revision = document({ '/loans': { get: operation({ responses: { '200': { description: 'OK', ...jsonBody(schema([])) } } }) } });

      expect(find(diffSpecs(base, revision), 'response-field-optional')[0]).toMatchObject({ severity: 'breaking' });
    });

    it('warns when a response enum gains a value clients have not seen', () => {
      const withValues = (values: string[]) => document({
        '/loans': { get: operation({ responses: { '200': { description: 'OK', ...jsonBody({ type: 'object', properties: { status: { type: 'string', enum: values } } }) } } }) },
      });

      expect(find(diffSpecs(withValues(['open']), withValues(['open', 'settled'])), 'response-enum-widened')[0]).toMatchObject({ severity: 'warning' });
    });

    it('flags a changed field type as breaking', () => {
      const withType = (type: string) => document({
        '/loans': { get: operation({ responses: { '200': { description: 'OK', ...jsonBody({ type: 'object', properties: { amount: { type } } }) } } }) },
      });

      expect(find(diffSpecs(withType('integer'), withType('string')), 'field-type-changed')[0]).toMatchObject({ severity: 'breaking' });
    });
  });

  describe('security', () => {
    it('flags a stricter requirement as breaking', () => {
      const base = document({ '/loans': { get: operation({ security: [] }) } });
      const revision = document({ '/loans': { get: operation({ security: [{ oauth: ['loans:read'] }] }) } });

      expect(find(diffSpecs(base, revision), 'security-tightened')[0]).toMatchObject({ severity: 'breaking' });
    });

    it('treats a relaxed requirement as compatible', () => {
      const base = document({ '/loans': { get: operation({ security: [{ oauth: ['loans:read'] }] }) } });
      const revision = document({ '/loans': { get: operation({ security: [] }) } });

      expect(find(diffSpecs(base, revision), 'security-relaxed')[0]).toMatchObject({ severity: 'compatible' });
    });

    it('falls back to the document requirement when an operation declares none', () => {
      const base = document({ '/loans': { get: operation() } }, { security: [] });
      const revision = document({ '/loans': { get: operation() } }, { security: [{ oauth: [] }] });

      expect(find(diffSpecs(base, revision), 'security-tightened')).toHaveLength(1);
    });

    it('treats an added authentication alternative as relaxed', () => {
      const base = document({ '/loans': { get: operation({ security: [{ oauth: [] }] }) } });
      const revision = document({ '/loans': { get: operation({ security: [{ oauth: [] }, { apiKey: [] }] }) } });
      const report = diffSpecs(base, revision);

      expect(find(report, 'security-relaxed')).toHaveLength(1);
      expect(find(report, 'security-tightened')).toHaveLength(0);
    });

    it('flags an added requirement within one alternative as tightened', () => {
      const base = document({ '/loans': { get: operation({ security: [{ oauth: [] }] }) } });
      const revision = document({ '/loans': { get: operation({ security: [{ oauth: [], apiKey: [] }] }) } });

      expect(find(diffSpecs(base, revision), 'security-tightened')).toHaveLength(1);
    });
  });

  describe('servers', () => {
    it('flags a removed server as breaking and an added one as compatible', () => {
      const base = document({}, { servers: [{ url: 'https://api.example.com' }] });
      const revision = document({}, { servers: [{ url: 'https://api.example.com/v2' }] });
      const report = diffSpecs(base, revision);

      expect(find(report, 'server-removed')[0]).toMatchObject({ severity: 'breaking' });
      expect(find(report, 'server-added')[0]).toMatchObject({ severity: 'compatible' });
    });
  });

  describe('shared components', () => {
    const withErrorSchema = (properties: Record<string, SchemaObject>) => document(
      {
        '/loans': { get: operation({ operationId: 'listLoans', responses: { '500': { description: 'Error', ...jsonBody({ $ref: '#/components/schemas/Error' }) } } }) },
        '/payments': { get: operation({ operationId: 'listPayments', responses: { '500': { description: 'Error', ...jsonBody({ $ref: '#/components/schemas/Error' }) } } }) },
      },
      { components: { schemas: { Error: { type: 'object', properties } } } },
    );

    it('counts a shared schema change once and lists the operations it reaches', () => {
      const base = withErrorSchema({ code: { type: 'string' }, detail: { type: 'string' } });
      const revision = withErrorSchema({ code: { type: 'string' } });
      const changes = find(diffSpecs(base, revision), 'response-field-removed');

      expect(changes).toHaveLength(1);
      expect(changes[0]?.affectedOperations?.map((item) => item.operationId).sort()).toEqual(['listLoans', 'listPayments']);
    });

    it('stays quiet when both sides point at an unchanged component', () => {
      const spec = withErrorSchema({ code: { type: 'string' } });

      expect(diffSpecs(spec, spec).changes).toEqual([]);
    });

    it('uses request compatibility rules for a request-only component', () => {
      const withInput = (schema: SchemaObject) => document(
        { '/loans': { post: operation({ requestBody: jsonBody({ $ref: '#/components/schemas/Input' }) }) } },
        { components: { schemas: { Input: schema } } },
      );
      const base = withInput({ type: 'object', properties: {} });
      const revision = withInput({ type: 'object', required: ['token'], properties: { token: { type: 'string' } } });
      const report = diffSpecs(base, revision);

      expect(find(report, 'request-field-required')[0]).toMatchObject({ severity: 'breaking' });
      expect(find(report, 'response-field-added')).toHaveLength(0);
    });

    it('compares inline against referenced schemas rather than reporting a false type change', () => {
      const inline = document({ '/loans': { get: operation({ responses: { '200': { description: 'OK', ...jsonBody({ type: 'object', properties: { id: { type: 'string' } } }) } } }) } });
      const referenced = document(
        { '/loans': { get: operation({ responses: { '200': { description: 'OK', ...jsonBody({ $ref: '#/components/schemas/Loan' }) } } }) } },
        { components: { schemas: { Loan: { type: 'object', properties: { id: { type: 'string' } } } } } },
      );

      expect(diffSpecs(inline, referenced).changes).toEqual([]);
    });
  });

  describe('change identity', () => {
    it('keeps ids stable when unrelated operations are added around a change', () => {
      const base = document({ '/loans': { get: operation({ parameters: [{ name: 'status', in: 'query' }] }) } });
      const revision = document({ '/loans': { get: operation({ parameters: [{ name: 'status', in: 'query', required: true }] }) } });
      const padded = document({
        '/accounts': { get: operation({ operationId: 'listAccounts' }) },
        '/loans': { get: operation({ parameters: [{ name: 'status', in: 'query', required: true }] }) },
      });

      const [first] = find(diffSpecs(base, revision), 'required-parameter-added');
      const [second] = find(diffSpecs(base, padded), 'required-parameter-added');

      expect(first?.id).toBe(second?.id);
    });

    it('gives every change a distinct id', () => {
      const base = document({ '/loans': { get: operation() }, '/payments': { get: operation({ operationId: 'listPayments' }) } });
      const report = diffSpecs(base, document({}));

      expect(new Set(report.changes.map((change) => change.id)).size).toBe(report.changes.length);
    });
  });

  describe('a real document', () => {
    const source = readFileSync(fileURLToPath(new URL('../../../apps/web/public/examples/managed-cards.yaml', import.meta.url)), 'utf8');
    const managedCards = parseSpec(source);
    const clone = (input: OpenAPIDocument) => JSON.parse(JSON.stringify(input)) as OpenAPIDocument;

    it('reports nothing when compared with itself', () => {
      expect(diffSpecs(source, source).changes).toEqual([]);
    });

    it('reports a newly required parameter and an added operation', () => {
      const revision = clone(managedCards);
      revision.paths!['/managed-cards']!.post!.parameters = [{ name: 'tenant', in: 'query', required: true }];
      revision.paths!['/managed-cards']!.get = { operationId: 'listManagedCards', responses: { '200': { description: 'Cards' } } };

      expect(ruleIds(diffSpecs(managedCards, revision))).toEqual(expect.arrayContaining(['required-parameter-added', 'operation-added']));
    });

    it('counts a nested shared component change once and attributes it to the reaching operation', () => {
      const revision = clone(managedCards);
      delete revision.components!.schemas!.ManagedInstrumentBalance!.properties!.available;
      const changes = find(diffSpecs(managedCards, revision), 'response-field-removed');

      expect(changes).toHaveLength(1);
      expect(changes[0]?.affectedOperations?.map((item) => item.operationId)).toEqual(['createManagedCard']);
    });

    it('reads a change through a discriminated union without repeating it per variant', () => {
      const revision = clone(managedCards);
      revision.components!.schemas!.ManagedCard!.properties!.mode!.type = 'integer';
      const changes = find(diffSpecs(managedCards, revision), 'field-type-changed');

      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({ severity: 'breaking' });
    });
  });
});
