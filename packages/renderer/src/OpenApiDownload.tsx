/**
 * ---
 * purpose: Offers canonical JSON and YAML downloads of the rendered OpenAPI document.
 * related:
 *   - ./Speccy.tsx - Places the download card on the API overview.
 *   - ./types.ts - Declares the OpenAPI document shape.
 * ---
 */

import { stringify as stringifyYaml } from 'yaml';
import type { OpenAPIDocument } from 'speccy-core';
import styles from './OpenApiDownload.module.css';

type DownloadFormat = 'json' | 'yaml';

function downloadDocument(document: OpenAPIDocument, format: DownloadFormat) {
  const content =
    format === 'json'
      ? `${JSON.stringify(document, null, 2)}\n`
      : stringifyYaml(document);
  const url = URL.createObjectURL(
    new Blob([content], {
      type: format === 'json' ? 'application/json' : 'application/yaml',
    }),
  );
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `openapi.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function OpenApiDownload({ document }: { document: OpenAPIDocument }) {
  return (
    <section
      className={`sp-download-card ${styles.card}`}
      aria-labelledby="sp-download-heading"
    >
      <h2 id="sp-download-heading">Download OpenAPI description</h2>
      <div className={`sp-download-options ${styles.options}`}>
        {(['json', 'yaml'] as const).map((format) => (
          <button
            type="button"
            onClick={() => downloadDocument(document, format)}
            key={format}
          >
            <span
              className={`sp-download-format sp-download-format-${format} ${styles.format} ${format === 'json' ? styles.jsonFormat : styles.yamlFormat}`}
            >
              {format}
            </span>
            <strong>openapi.{format}</strong>
            <DownloadIcon />
          </button>
        ))}
      </div>
    </section>
  );
}
