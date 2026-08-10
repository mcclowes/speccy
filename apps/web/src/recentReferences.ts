/**
 * ---
 * purpose: Owns recent-reference identity, ordering, labels, and fault-tolerant browser persistence.
 * related:
 *   - ./App.tsx - Displays and opens the stored references managed here.
 * ---
 */

export interface RecentReference {
  id: string;
  name: string;
  source: string;
  sourceUrl?: string;
  openedAt: number;
}

const STORAGE_KEY = 'speccy-recent-references';
const MAX_RECENTS = 6;

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readRecentReferences(): RecentReference[] {
  try {
    const references = JSON.parse(storage()?.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(references) ? references.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

export function writeRecentReferences(references: RecentReference[]): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(references));
  } catch {
    // The active reference remains usable when storage is unavailable or full.
  }
}

export function addRecentReference(
  references: RecentReference[],
  input: Omit<RecentReference, 'id' | 'openedAt'>,
  existingId?: string,
  openedAt = Date.now(),
): { reference: RecentReference; references: RecentReference[] } {
  const existing = existingId
    ? references.find((item) => item.id === existingId)
    : references.find(
        (item) => item.name === input.name && item.source === input.source,
      );
  const timestamp = existing?.openedAt ?? openedAt;
  const id = existing?.id ?? existingId ?? `${input.name}-${timestamp}`;
  const reference = {
    ...input,
    id,
    openedAt: timestamp,
    sourceUrl: input.sourceUrl ?? existing?.sourceUrl,
  };
  return {
    reference,
    references: [
      reference,
      ...references.filter((item) => item.id !== id),
    ].slice(0, MAX_RECENTS),
  };
}

export function recentReferenceLabel(
  reference: RecentReference,
  references: RecentReference[],
): string {
  if (references.filter((item) => item.name === reference.name).length < 2)
    return reference.name;
  const imported = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(reference.openedAt);
  return `${reference.name} — ${imported}`;
}
