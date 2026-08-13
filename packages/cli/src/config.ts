/**
 * ---
 * purpose: Loads and validates repository-level Speccy rule configuration from .speccyrc.
 * related:
 *   - ./run.ts - Applies the resulting diagnostic policy while linting.
 *   - ./sources.ts - Provides the filesystem abstraction used by tests and the CLI.
 * ---
 */

import {
  PROTECTED_RULE_IDS,
  SPECCY_RULE_IDS,
  type DiagnosticIgnore,
  type DiagnosticPolicy,
  type DiagnosticRuleSetting,
} from 'speccy-core';
import type { SourceIO } from './sources';

export interface SpeccyConfig extends DiagnosticPolicy {
  extends: ['speccy:recommended'];
  rules: Record<string, DiagnosticRuleSetting>;
  ignore: DiagnosticIgnore[];
}

const severities = new Set(['issue', 'warning', 'suggestion']);
const knownRules = new Set<string>(SPECCY_RULE_IDS);
const protectedRules = new Set<string>(PROTECTED_RULE_IDS);

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringArray(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || !item.trim())
  )
    throw new Error(`${label} must be an array of non-empty strings.`);
  return value;
}

function validateRuleName(rule: string, configPath: string) {
  if (!knownRules.has(rule))
    throw new Error(`${configPath} contains unknown rule "${rule}".`);
}

function validateRuleSetting(
  rule: string,
  value: unknown,
  configPath: string,
): DiagnosticRuleSetting {
  if (typeof value === 'boolean') {
    if (!value && protectedRules.has(rule))
      throw new Error(`${configPath} cannot disable protected rule "${rule}".`);
    return value;
  }
  if (typeof value === 'string' && severities.has(value))
    return value as DiagnosticRuleSetting;
  if (!object(value))
    throw new Error(
      `${configPath} rule "${rule}" must be true, false, a severity, or an options object.`,
    );

  const allowedKeys =
    rule === 'new-operation-lifecycle'
      ? new Set(['severity', 'maxAgeDays', 'allowedStages'])
      : new Set(['severity']);
  for (const key of Object.keys(value))
    if (!allowedKeys.has(key))
      throw new Error(
        `${configPath} rule "${rule}" does not support option "${key}".`,
      );
  if (value.severity !== undefined && !severities.has(value.severity as string))
    throw new Error(`${configPath} rule "${rule}" has an invalid severity.`);
  if (
    value.maxAgeDays !== undefined &&
    (!Number.isInteger(value.maxAgeDays) || (value.maxAgeDays as number) < 1)
  )
    throw new Error(`${configPath} maxAgeDays must be a positive integer.`);
  if (value.allowedStages !== undefined)
    stringArray(value.allowedStages, `${configPath} allowedStages`);
  return value as DiagnosticRuleSetting;
}

export async function loadSpeccyConfig(
  io: SourceIO,
  configPath = '.speccyrc',
): Promise<SpeccyConfig> {
  const defaults: SpeccyConfig = {
    extends: ['speccy:recommended'],
    rules: {},
    ignore: [],
  };
  if (!(await io.exists(configPath))) return defaults;

  let value: unknown;
  try {
    value = JSON.parse(await io.readFile(configPath));
  } catch (error) {
    throw new Error(`${configPath} must contain valid JSON.`, { cause: error });
  }
  if (!object(value))
    throw new Error(`${configPath} must contain a JSON object.`);
  for (const key of Object.keys(value))
    if (!['extends', 'rules', 'ignore'].includes(key))
      throw new Error(`${configPath} contains unknown property "${key}".`);

  const inherited =
    value.extends === undefined
      ? defaults.extends
      : stringArray(value.extends, `${configPath} extends`);
  if (inherited.length !== 1 || inherited[0] !== 'speccy:recommended')
    throw new Error(
      `${configPath} extends currently supports only "speccy:recommended".`,
    );

  if (value.rules !== undefined && !object(value.rules))
    throw new Error(`${configPath} rules must be a JSON object.`);
  const rules: Record<string, DiagnosticRuleSetting> = {};
  for (const [rule, setting] of Object.entries(value.rules ?? {})) {
    validateRuleName(rule, configPath);
    rules[rule] = validateRuleSetting(rule, setting, configPath);
  }

  if (value.ignore !== undefined && !Array.isArray(value.ignore))
    throw new Error(`${configPath} ignore must be an array.`);
  const ignore = (value.ignore ?? []).map((entry, index) => {
    if (!object(entry))
      throw new Error(`${configPath} ignore[${index}] must be an object.`);
    const ignoredRules = stringArray(
      entry.rules,
      `${configPath} ignore[${index}].rules`,
    );
    ignoredRules.forEach((rule) => {
      validateRuleName(rule, configPath);
      if (protectedRules.has(rule))
        throw new Error(
          `${configPath} cannot ignore protected rule "${rule}".`,
        );
    });
    return {
      rules: ignoredRules,
      paths: stringArray(entry.paths, `${configPath} ignore[${index}].paths`),
    };
  });

  return { extends: ['speccy:recommended'], rules, ignore };
}
