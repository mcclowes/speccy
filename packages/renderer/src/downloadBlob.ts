/**
 * ---
 * purpose: Saves generated text to the reader's device through a temporary object URL.
 * related:
 *   - ./OpenApiDownload.tsx - Downloads the OpenAPI document as JSON or YAML.
 *   - ./DeveloperDiagnostics.tsx - Exports API health findings as CSV.
 * ---
 */

export function downloadBlob(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
