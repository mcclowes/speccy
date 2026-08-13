/**
 * ---
 * purpose: Live GitHub repository and npm package cards for Speccy's public site.
 * related:
 *   - ../pages/index.tsx - Homepage placement for the cards.
 *   - ./ProjectCards.module.css - Shared visual treatment for both cards.
 * ---
 */

import React, { useEffect, useState, type CSSProperties } from 'react';
import styles from './ProjectCards.module.css';

type CardProps = {
  className?: string;
  style?: CSSProperties;
};

type GitHubRepository = {
  description: string | null;
  forks_count: number;
  html_url: string;
  language: string | null;
  license: { spdx_id: string } | null;
  stargazers_count: number;
  topics: string[];
  updated_at: string;
  visibility: string;
};

type NpmPackage = {
  description?: string;
  keywords?: string[];
  license?: string | string[];
  time?: Record<string, string>;
  versions?: Record<
    string,
    { keywords?: string[]; license?: string | string[] }
  >;
  'dist-tags'?: { latest?: string };
};

function formatMetric(value: number) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function cardClassName(className?: string) {
  return [styles.card, className].filter(Boolean).join(' ');
}

export function GitHubRepoCard({
  repo,
  className,
  style,
}: CardProps & { repo: string }) {
  const [data, setData] = useState<GitHubRepository | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(false);

    fetch(`https://api.github.com/repos/${repo}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<GitHubRepository>;
      })
      .then(setData)
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setError(true);
        }
      });

    return () => controller.abort();
  }, [repo]);

  return (
    <a
      className={cardClassName(className)}
      href={data?.html_url ?? `https://github.com/${repo}`}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
    >
      <CardHeader
        icon={<GitHubIcon />}
        name={repo}
        badge={error ? 'Unavailable' : data ? data.visibility : 'Loading…'}
        error={error}
      />
      <p className={styles.description}>
        {error
          ? 'Open the repository on GitHub.'
          : (data?.description ?? 'Fetching repository details…')}
      </p>
      {data ? (
        <>
          <div className={styles.meta}>
            <span title="Stars">★ {formatMetric(data.stargazers_count)}</span>
            <span title="Forks">⑂ {formatMetric(data.forks_count)}</span>
            {data.language ? <span>{data.language}</span> : null}
            {data.license?.spdx_id && data.license.spdx_id !== 'NOASSERTION' ? (
              <span>{data.license.spdx_id}</span>
            ) : null}
          </div>
          <Tags values={data.topics} />
        </>
      ) : null}
    </a>
  );
}

export function NpmPackageCard({
  packageName,
  className,
  style,
}: CardProps & { packageName: string }) {
  const [data, setData] = useState<NpmPackage | null>(null);
  const [downloads, setDownloads] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const encodedName = encodeURIComponent(packageName);
    setData(null);
    setDownloads(null);
    setError(false);

    Promise.all([
      fetch(`https://registry.npmjs.org/${encodedName}`, {
        signal: controller.signal,
      }),
      fetch(`https://api.npmjs.org/downloads/point/last-week/${encodedName}`, {
        signal: controller.signal,
      }),
    ])
      .then(async ([packageResponse, downloadsResponse]) => {
        if (!packageResponse.ok)
          throw new Error(String(packageResponse.status));
        const packageData = (await packageResponse.json()) as NpmPackage;
        const downloadData = downloadsResponse.ok
          ? ((await downloadsResponse.json()) as { downloads?: number })
          : null;
        setData(packageData);
        setDownloads(downloadData?.downloads ?? null);
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setError(true);
        }
      });

    return () => controller.abort();
  }, [packageName]);

  const latest = data?.['dist-tags']?.latest;
  const latestData = latest ? data?.versions?.[latest] : undefined;
  const license = latestData?.license ?? data?.license;
  const keywords = latestData?.keywords ?? data?.keywords ?? [];

  return (
    <a
      className={`${cardClassName(className)} ${styles.npmCard}`}
      href={`https://www.npmjs.com/package/${packageName}`}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
    >
      <CardHeader
        icon={<NpmIcon />}
        name={packageName}
        badge={error ? 'Unavailable' : latest ? `v${latest}` : 'Loading…'}
        error={error}
      />
      <p className={styles.description}>
        {error
          ? 'Open the package on npm.'
          : (data?.description ?? 'Fetching package details…')}
      </p>
      {data ? (
        <>
          <div className={styles.meta}>
            {downloads !== null ? (
              <span>↓ {formatMetric(downloads)} downloads/week</span>
            ) : null}
            {license ? (
              <span>
                {Array.isArray(license) ? license.join(', ') : license}
              </span>
            ) : null}
          </div>
          <Tags values={keywords} />
        </>
      ) : null}
    </a>
  );
}

function CardHeader({
  icon,
  name,
  badge,
  error,
}: {
  icon: React.ReactNode;
  name: string;
  badge: string;
  error: boolean;
}) {
  return (
    <div className={styles.header}>
      <div className={styles.name}>
        {icon}
        <strong>{name}</strong>
      </div>
      <span className={error ? styles.errorBadge : styles.badge}>{badge}</span>
    </div>
  );
}

function Tags({ values }: { values: string[] }) {
  return values.length ? (
    <div className={styles.tags}>
      {values.slice(0, 5).map((value) => (
        <span key={value}>{value}</span>
      ))}
    </div>
  ) : null;
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.34-3.37-1.34-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.6 9.6 0 0 1 12 6.84a9.6 9.6 0 0 1 2.5.34c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function NpmIcon() {
  return (
    <svg viewBox="0 0 27 27" aria-hidden="true">
      <rect width="27" height="27" rx="3" fill="#cb3837" />
      <path fill="white" d="M6 21.5h7.8V10h3.9v11.5h3.8V6H6v15.5Z" />
    </svg>
  );
}
