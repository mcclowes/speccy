/**
 * ---
 * purpose: Resolves a spec argument that may be a file path, a git ref, or a URL.
 * related:
 *   - ./cli.ts - Passes user arguments through here before analysis.
 * ---
 */

import { execFile } from 'node:child_process';
import { access, readFile as readFileFromDisk } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);

export type SourceKind = 'file' | 'git' | 'url';

/** The ref itself is unreachable, which usually means a shallow clone rather than a typo. */
export class MissingRefError extends Error {
  constructor(public readonly ref: string) {
    super(`Cannot reach the git ref ${ref}.`);
    this.name = 'MissingRefError';
  }
}

export class MissingSpecError extends Error {
  constructor(source: string) {
    super(`No spec at ${source}.`);
    this.name = 'MissingSpecError';
  }
}

export interface SourceIO {
  readFile: (path: string) => Promise<string>;
  exists: (path: string) => Promise<boolean>;
  /** Resolves to undefined when the ref exists but does not contain the file. */
  git: (ref: string, path: string) => Promise<string | undefined>;
  fetch: (url: string) => Promise<string>;
}

export async function resolveSourceKind(
  source: string,
  exists: (path: string) => Promise<boolean>,
): Promise<SourceKind> {
  if (/^https?:\/\//i.test(source)) return 'url';
  if (await exists(source)) return 'file';
  return source.includes(':') ? 'git' : 'file';
}

export async function readSource(
  source: string,
  io: SourceIO,
): Promise<string | undefined> {
  const kind = await resolveSourceKind(source, io.exists);
  if (kind === 'url') return io.fetch(source);
  if (kind === 'file') {
    if (!(await io.exists(source))) throw new MissingSpecError(source);
    return io.readFile(source);
  }

  const separator = source.indexOf(':');
  const ref = source.slice(0, separator);
  const path = source.slice(separator + 1);
  try {
    return await io.git(ref, path);
  } catch (error) {
    if (error instanceof MissingRefError) {
      throw new Error(
        `Cannot reach the git ref ${ref}. In CI, check out enough history for it, for example with fetch-depth: 0.`,
        { cause: error },
      );
    }
    throw error;
  }
}

export const nodeSourceIO: SourceIO = {
  readFile: (path) => readFileFromDisk(path, 'utf8'),
  exists: async (path) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  },
  git: async (ref, path) => {
    try {
      await run('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
    } catch {
      throw new MissingRefError(ref);
    }
    try {
      const { stdout } = await run('git', ['show', `${ref}:${path}`], {
        maxBuffer: 64 * 1024 * 1024,
      });
      return stdout;
    } catch {
      // The ref is reachable but does not carry this file, so the spec is new on this branch.
      return undefined;
    }
  },
  fetch: async (url) => {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(
        `Fetching ${url} failed with ${response.status} ${response.statusText}.`,
      );
    return response.text();
  },
};
