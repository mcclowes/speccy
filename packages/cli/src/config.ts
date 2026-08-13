/**
 * ---
 * purpose: Loads and validates repository-level Speccy rule configuration from .speccyrc.
 * related:
 *   - ./run.ts - Applies disabled rules while linting.
 *   - ./sources.ts - Provides the filesystem abstraction used by tests and the CLI.
 * ---
 */

import type { SourceIO } from './sources';

export interface SpeccyConfig {
  rules: Record<string, boolean>;
}

export async function loadSpeccyConfig(
  io: SourceIO,
  configPath = '.speccyrc',
): Promise<SpeccyConfig> {
  if (!(await io.exists(configPath))) return { rules: {} };

  let value: unknown;
  try {
    value = JSON.parse(await io.readFile(configPath));
  } catch (error) {
    throw new Error(`${configPath} must contain valid JSON.`, { cause: error });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${configPath} must contain a JSON object.`);

  const rules = (value as { rules?: unknown }).rules;
  if (rules === undefined) return { rules: {} };
  if (!rules || typeof rules !== 'object' || Array.isArray(rules))
    throw new Error(`${configPath} rules must be a JSON object.`);

  for (const [rule, enabled] of Object.entries(rules))
    if (typeof enabled !== 'boolean')
      throw new Error(`${configPath} rule "${rule}" must be true or false.`);

  return { rules: rules as Record<string, boolean> };
}
