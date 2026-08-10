// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addRecentReference,
  readRecentReferences,
  writeRecentReferences,
} from './recentReferences';

describe('recent references', () => {
  beforeEach(() => window.localStorage.clear());

  it('reuses an exact duplicate and moves it to the front', () => {
    const first = addRecentReference(
      [],
      { name: 'Catalog', source: '{}' },
      undefined,
      10,
    );
    const second = addRecentReference(
      first.references,
      { name: 'Other', source: '{}' },
      undefined,
      20,
    );
    const duplicate = addRecentReference(
      second.references,
      { name: 'Catalog', source: '{}' },
      undefined,
      30,
    );

    expect(duplicate.reference.id).toBe(first.reference.id);
    expect(duplicate.references.map((item) => item.name)).toEqual([
      'Catalog',
      'Other',
    ]);
  });

  it('keeps references usable when persistence fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full');
    });
    expect(() =>
      writeRecentReferences([
        { id: 'one', name: 'Catalog', source: '{}', openedAt: 1 },
      ]),
    ).not.toThrow();
    expect(readRecentReferences()).toEqual([]);
  });
});
