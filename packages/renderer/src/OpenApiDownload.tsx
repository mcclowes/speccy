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
import { CopyButton } from './CodeBlock';
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

function ExternalIcon() {
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
      <path d="M14 4h6v6" />
      <path d="m20 4-9 9" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </svg>
  );
}

export interface OpenApiDownloadProps {
  document: OpenAPIDocument;
  openApiUrl?: string;
  postmanCollectionUrl?: string;
}

export function OpenApiDownload({
  document,
  openApiUrl,
  postmanCollectionUrl,
}: OpenApiDownloadProps) {
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
        {openApiUrl && (
          <div className={styles.urlOption}>
            <a href={openApiUrl}>
              <span className={`${styles.format} ${styles.openapiFormat}`}>
                API
              </span>
              <strong>Open OpenAPI description</strong>
              <ExternalIcon />
            </a>
            <CopyButton value={openApiUrl} compact />
          </div>
        )}
        {postmanCollectionUrl && (
          <a
            className={styles.postmanOption}
            href={postmanCollectionUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span className={styles.postmanMark}>P</span>
            <strong>Run in Postman</strong>
            <ExternalIcon />
          </a>
        )}
      </div>
    </section>
  );
}
