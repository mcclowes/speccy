import { Spectral } from '@stoplight/spectral-core';
import { oas } from '@stoplight/spectral-rulesets';
import type { OpenAPIDocument, SpectralDiagnosticInput } from 'speccy-renderer';

export async function runSpectral(document: OpenAPIDocument | string): Promise<SpectralDiagnosticInput[]> {
  const spectral = new Spectral();
  spectral.setRuleset(oas as never);
  return (await spectral.run(document)).map((result) => ({ code: result.code ?? 'spectral', message: result.message, severity: result.severity, path: result.path.map(String), range: result.range }));
}
