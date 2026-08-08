/**
 * ---
 * purpose: Defines the semantic diff contract shared by the analyzers, the renderer, and the CLI.
 * related:
 *   - ./oasdiff.ts - Adapts oasdiff changelog output into this contract.
 *   - ../../renderer/src/SpecDiff.tsx - Presents a report built to this contract.
 * ---
 */

import type { HttpMethod } from './types';

export type DiffSeverity = 'breaking' | 'warning' | 'compatible' | 'documentation';
export type DiffKind = 'added' | 'removed' | 'changed' | 'deprecated';
export type DiffArea = 'operation' | 'parameters' | 'request-body' | 'response-body' | 'headers' | 'security' | 'documentation';

export interface DiffSpecVersion {
  title?: string;
  version?: string;
  source?: string;
}

export interface DiffSourceLocation {
  source?: string;
  line?: number;
  column?: number;
}

export interface DiffOperation {
  method: HttpMethod;
  path: string;
  operationId?: string;
  tag?: string;
}

export interface ApiChange {
  id: string;
  severity: DiffSeverity;
  kind: DiffKind;
  method?: HttpMethod;
  path?: string;
  operationId?: string;
  tag?: string;
  /** Operations affected by a shared component change. The change is counted once. */
  affectedOperations?: DiffOperation[];
  scope?: {
    area: DiffArea;
    /** Human-readable detail such as "200 · application/json · Loan.status". */
    label?: string;
  };
  location: string[];
  message: string;
  before?: unknown;
  after?: unknown;
  source?: {
    base?: DiffSourceLocation;
    revision?: DiffSourceLocation;
  };
}

export interface DiffReport {
  base: DiffSpecVersion;
  revision: DiffSpecVersion;
  changes: ApiChange[];
}
