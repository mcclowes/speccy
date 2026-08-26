/**
 * ---
 * purpose: Offers canonical JSON and YAML downloads of the rendered OpenAPI document, plus its published URL.
 * related:
 *   - ./Speccy.tsx - Places the download card on the API overview.
 *   - ./types.ts - Declares the OpenAPI document shape.
 * ---
 */

import type { ReactNode } from 'react';
import { stringify as stringifyYaml } from 'yaml';
import type { OpenAPIDocument } from 'speccy-core';
import { CopyButton } from './CodeBlock';
import { downloadBlob } from './downloadBlob';
import styles from './OpenApiDownload.module.css';

type DownloadFormat = 'json' | 'yaml';

const FORMATS: Record<
  DownloadFormat,
  {
    serialize: (document: OpenAPIDocument) => string;
    mimeType: string;
    className: string | undefined;
  }
> = {
  json: {
    serialize: (document) => `${JSON.stringify(document, null, 2)}\n`,
    mimeType: 'application/json',
    className: styles.jsonFormat,
  },
  yaml: {
    serialize: (document) => stringifyYaml(document),
    mimeType: 'application/yaml',
    className: styles.yamlFormat,
  },
};

function downloadDocument(document: OpenAPIDocument, format: DownloadFormat) {
  const { serialize, mimeType } = FORMATS[format];
  downloadBlob(serialize(document), `openapi.${format}`, mimeType);
}

function StrokeIcon({ children }: { children: ReactNode }) {
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
      {children}
    </svg>
  );
}

function DownloadIcon() {
  return (
    <StrokeIcon>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </StrokeIcon>
  );
}

function ExternalIcon() {
  return (
    <StrokeIcon>
      <path d="M14 4h6v6" />
      <path d="m20 4-9 9" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </StrokeIcon>
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
      <h2 id="sp-download-heading">OpenAPI description</h2>
      <div className={`sp-download-options ${styles.options}`}>
        {(['json', 'yaml'] as const).map((format) => (
          <button
            type="button"
            onClick={() => downloadDocument(document, format)}
            key={format}
          >
            <span
              className={`sp-download-format sp-download-format-${format} ${styles.format} ${FORMATS[format].className}`}
            >
              {format}
            </span>
            <strong>openapi.{format}</strong>
            <DownloadIcon />
          </button>
        ))}
        {openApiUrl && (
          <div className={styles.urlOption}>
            <a href={openApiUrl} target="_blank" rel="noreferrer">
              <span className={`${styles.format} ${styles.openapiFormat}`}>
                URL
              </span>
              <strong className={styles.url} title={openApiUrl}>
                {openApiUrl}
              </strong>
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
