import { describe, expect, it } from 'vitest';
import { serializeParameter } from './parameterSerialization';

describe('OpenAPI parameter serialization', () => {
  it.each([
    [
      'path simple primitive',
      { name: 'id', in: 'path', style: 'simple' },
      'blue',
      'blue',
    ],
    [
      'path simple array',
      { name: 'id', in: 'path', style: 'simple' },
      ['a', 'b'],
      'a,b',
    ],
    [
      'path simple exploded object',
      { name: 'id', in: 'path', style: 'simple', explode: true },
      { role: 'admin', active: true },
      'role=admin,active=true',
    ],
    [
      'path simple object',
      { name: 'id', in: 'path', style: 'simple', explode: false },
      { role: 'admin', active: true },
      'role,admin,active,true',
    ],
    [
      'path label array',
      { name: 'id', in: 'path', style: 'label' },
      ['a', 'b'],
      '.a,b',
    ],
    [
      'path label exploded array',
      { name: 'id', in: 'path', style: 'label', explode: true },
      ['a', 'b'],
      '.a.b',
    ],
    [
      'path label object',
      { name: 'id', in: 'path', style: 'label', explode: false },
      { role: 'admin', active: true },
      '.role,admin,active,true',
    ],
    [
      'path label exploded object',
      { name: 'id', in: 'path', style: 'label', explode: true },
      { role: 'admin', active: true },
      '.role=admin.active=true',
    ],
    [
      'path matrix primitive',
      { name: 'id', in: 'path', style: 'matrix' },
      'blue',
      ';id=blue',
    ],
    [
      'path matrix array',
      { name: 'id', in: 'path', style: 'matrix', explode: false },
      ['a', 'b'],
      ';id=a,b',
    ],
    [
      'path matrix exploded array',
      { name: 'id', in: 'path', style: 'matrix', explode: true },
      ['a', 'b'],
      ';id=a;id=b',
    ],
    [
      'path matrix object',
      { name: 'id', in: 'path', style: 'matrix', explode: false },
      { role: 'admin', active: true },
      ';id=role,admin,active,true',
    ],
    [
      'path matrix exploded object',
      { name: 'id', in: 'path', style: 'matrix', explode: true },
      { role: 'admin', active: true },
      ';role=admin;active=true',
    ],
    [
      'query form array',
      { name: 'id', in: 'query', style: 'form', explode: false },
      ['a', 'b'],
      [['id', 'a,b']],
    ],
    [
      'query form exploded array',
      { name: 'id', in: 'query', style: 'form', explode: true },
      ['a', 'b'],
      [
        ['id', 'a'],
        ['id', 'b'],
      ],
    ],
    [
      'query form object',
      { name: 'filter', in: 'query', style: 'form', explode: false },
      { role: 'admin', active: true },
      [['filter', 'role,admin,active,true']],
    ],
    [
      'query form exploded object',
      { name: 'filter', in: 'query', style: 'form', explode: true },
      { role: 'admin', active: true },
      [
        ['role', 'admin'],
        ['active', 'true'],
      ],
    ],
    [
      'query space delimited',
      { name: 'id', in: 'query', style: 'spaceDelimited' },
      ['a', 'b'],
      [['id', 'a b']],
    ],
    [
      'query pipe delimited',
      { name: 'id', in: 'query', style: 'pipeDelimited' },
      ['a', 'b'],
      [['id', 'a|b']],
    ],
    [
      'query deep object',
      { name: 'filter', in: 'query', style: 'deepObject' },
      { role: 'admin' },
      [['filter[role]', 'admin']],
    ],
    [
      'header simple object',
      { name: 'X-Filter', in: 'header', style: 'simple' },
      { role: 'admin' },
      'role,admin',
    ],
    [
      'cookie form object',
      { name: 'filter', in: 'cookie', style: 'form', explode: true },
      { role: 'admin' },
      'role=admin',
    ],
    [
      'cookie form array',
      { name: 'id', in: 'cookie', style: 'form', explode: false },
      ['a', 'b'],
      'id=a,b',
    ],
    [
      'cookie form exploded array',
      { name: 'id', in: 'cookie', style: 'form', explode: true },
      ['a', 'b'],
      'id=a&id=b',
    ],
    [
      'cookie form object',
      { name: 'filter', in: 'cookie', style: 'form', explode: false },
      { role: 'admin', active: true },
      'filter=role,admin,active,true',
    ],
    [
      'cookie primitive',
      { name: 'session', in: 'cookie' },
      'abc',
      'session=abc',
    ],
    [
      'JSON content parameter',
      { name: 'filter', in: 'query', content: { 'application/json': {} } },
      { role: 'admin' },
      [['filter', '{"role":"admin"}']],
    ],
    [
      'JSON content path parameter',
      { name: 'filter', in: 'path', content: { 'application/json': {} } },
      { role: 'admin' },
      '{"role":"admin"}',
    ],
    [
      'JSON content header parameter',
      { name: 'filter', in: 'header', content: { 'application/json': {} } },
      { role: 'admin' },
      '{"role":"admin"}',
    ],
    [
      'JSON content cookie parameter',
      { name: 'filter', in: 'cookie', content: { 'application/json': {} } },
      { role: 'admin' },
      'filter={"role":"admin"}',
    ],
  ] as const)('%s', (_label, parameter, value, expected) => {
    expect(serializeParameter(parameter, value)).toEqual(expected);
  });
});
