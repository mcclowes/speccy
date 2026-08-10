import { describe, expect, it } from 'vitest';
import { serializeParameter } from './parameterSerialization';

describe('OpenAPI parameter serialization', () => {
  it.each([
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
      'path label array',
      { name: 'id', in: 'path', style: 'label' },
      ['a', 'b'],
      '.a,b',
    ],
    [
      'path matrix exploded array',
      { name: 'id', in: 'path', style: 'matrix', explode: true },
      ['a', 'b'],
      ';id=a;id=b',
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
  ] as const)('%s', (_label, parameter, value, expected) => {
    expect(serializeParameter(parameter, value)).toEqual(expected);
  });
});
