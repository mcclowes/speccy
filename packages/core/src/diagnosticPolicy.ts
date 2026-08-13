/**
 * ---
 * purpose: Defines configurable diagnostic policy and applies rule overrides and scoped ignores.
 * related:
 *   - ./diagnostics.ts - Produces the diagnostics filtered here.
 *   - ../../cli/src/config.ts - Validates .speccyrc into this policy shape.
 * ---
 */

import type { ApiDiagnostic, DiagnosticSeverity } from './diagnostics';

export const SPECCY_RULE_IDS = [
  'api-description',
  'api-key-location',
  'async-operation-progress',
  'boolean-schema-changed',
  'collection-pagination',
  'consistent-error-shape',
  'deep-resource-path',
  'deletion-semantics',
  'enum-values-documented',
  'error-correlation-id',
  'error-response',
  'field-format-changed',
  'field-type-changed',
  'get-request-body',
  'idempotency-guidance',
  'literal-path-identifier',
  'machine-readable-error-code',
  'mixed-pagination',
  'money-precision',
  'new-operation-lifecycle',
  'new-operation-lifecycle-expired',
  'no-content-body',
  'noun-paths',
  'oauth-scope-description',
  'object-has-properties',
  'operation-description',
  'operation-description-changed',
  'operation-added',
  'operation-deprecated',
  'operation-id',
  'operation-id-unique',
  'operation-removed',
  'operation-security',
  'operation-summary',
  'operation-summary-changed',
  'pagination-order',
  'parameter-description',
  'parameter-added',
  'parameter-removed',
  'path-parameter-declared',
  'path-parameter-renamed',
  'path-parameter-required',
  'placeholder-description',
  'property-description',
  'request-body-description',
  'request-body-added',
  'request-body-removed',
  'request-body-required',
  'request-enum-narrowed',
  'request-enum-widened',
  'request-example',
  'request-field-added',
  'request-field-removed',
  'request-field-required',
  'request-media-type',
  'required-parameter-added',
  'response-description',
  'response-added',
  'response-enum-narrowed',
  'response-enum-widened',
  'response-example',
  'response-field-added',
  'response-field-optional',
  'response-field-removed',
  'response-header-added',
  'response-header-removed',
  'response-removed',
  'schema-composition-changed',
  'security-relaxed',
  'security-tightened',
  'security-description',
  'server-description',
  'server-added',
  'server-removed',
  'status-present-condition',
  'structured-error-response',
  'success-response',
  'success-response-schema',
  'tag-description',
  'timestamp-format',
  'unauthenticated-mutation',
  'unused-path-parameter',
  'weak-operation-description',
  'webhook-event-id',
  'webhook-event-name',
  'webhook-resource-reference',
  'webhook-timestamp',
  'webhook-version',
] as const;

export type SpeccyRuleId = (typeof SPECCY_RULE_IDS)[number];

export const PROTECTED_RULE_IDS = [
  'get-request-body',
  'no-content-body',
  'operation-id-unique',
  'path-parameter-declared',
  'unused-path-parameter',
] as const satisfies readonly SpeccyRuleId[];

export interface DiagnosticRuleOptions {
  severity?: DiagnosticSeverity;
  maxAgeDays?: number;
  allowedStages?: string[];
}

export type DiagnosticRuleSetting =
  boolean | DiagnosticSeverity | DiagnosticRuleOptions;

export interface DiagnosticIgnore {
  rules: string[];
  paths: string[];
}

export interface DiagnosticPolicy {
  rules?: Record<string, DiagnosticRuleSetting>;
  ignore?: DiagnosticIgnore[];
}

function globMatches(pattern: string, value: string): boolean {
  const expression = pattern
    .split('**')
    .map((part) =>
      part
        .split('*')
        .map((text) => text.replace(/[|\\{}()[\]^$+?.]/g, '\\$&'))
        .join('[^/]*'),
    )
    .join('.*');
  return new RegExp(`^${expression}$`).test(value);
}

function diagnosticApiPath(diagnostic: ApiDiagnostic): string | undefined {
  return diagnostic.path[0] === 'paths' &&
    typeof diagnostic.path[1] === 'string'
    ? diagnostic.path[1]
    : undefined;
}

export function applyDiagnosticPolicy(
  diagnostics: ApiDiagnostic[],
  policy: DiagnosticPolicy = {},
): ApiDiagnostic[] {
  return diagnostics.flatMap((diagnostic) => {
    const setting = policy.rules?.[diagnostic.ruleId];
    if (setting === false) return [];
    const apiPath = diagnosticApiPath(diagnostic);
    if (
      apiPath &&
      policy.ignore?.some(
        (ignore) =>
          ignore.rules.includes(diagnostic.ruleId) &&
          ignore.paths.some((pattern) => globMatches(pattern, apiPath)),
      )
    )
      return [];

    const severity =
      typeof setting === 'string'
        ? setting
        : setting && typeof setting === 'object'
          ? setting.severity
          : undefined;
    return [{ ...diagnostic, severity: severity ?? diagnostic.severity }];
  });
}
