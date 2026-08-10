/**
 * ---
 * purpose: Generates request snippets and renders the persistent language selector shared by API operations.
 * related:
 *   - ./Speccy.tsx - Supplies live request values to the sample.
 *   - ./CodeBlock.tsx - Presents and copies the generated snippet.
 * ---
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CodeBlock, CopyButton } from './CodeBlock';
import { useLocalState } from './useLocalState';
import { DisclosureChevron } from './DesignSystem';
import styles from './RequestSample.module.css';

export type RequestSampleLanguage =
  'curl' | 'javascript' | 'node' | 'python' | 'java' | 'csharp' | 'php' | 'go';

export interface RequestSampleValue {
  method: string;
  url: string;
  headers?: string[];
  body?: string;
}

const LANGUAGES: { value: RequestSampleLanguage; label: string }[] = [
  { value: 'curl', label: 'cURL' },
  { value: 'javascript', label: 'Browser JavaScript' },
  { value: 'node', label: 'Node.js' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'go', label: 'Go' },
];

function LanguageIcon({
  language,
}: {
  language: RequestSampleLanguage;
}): ReactNode {
  if (language === 'curl')
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M22.23 4.702a.967.967 0 1 1 0-1.934.967.967 0 0 1 0 1.934m-9.608 16.531a.967.967 0 1 1 0-1.934.967.967 0 0 1 0 1.934M22.23 1.964a1.771 1.771 0 0 0-1.652 2.36l-8.309 14.241a1.737 1.737 0 0 0-1.418 1.7 1.771 1.771 0 1 0 3.43-.553l8.351-14.288a1.74 1.74 0 0 0 1.369-1.69c0-.977-.793-1.77-1.771-1.77m-7.247 2.738a.967.967 0 1 1 0-1.934.967.967 0 0 1 0 1.934M5.374 21.233a.967.967 0 1 1 0-1.934.967.967 0 0 1 0 1.934M14.983 1.964a1.771 1.771 0 0 0-1.652 2.36L5.022 18.565a1.738 1.738 0 0 0-1.419 1.7 1.771 1.771 0 1 0 3.431-.553l8.351-14.288a1.74 1.74 0 0 0 1.369-1.69c0-.977-.793-1.77-1.771-1.77M1.749 7.663a.967.967 0 1 1 0 1.934.967.967 0 0 1 0-1.934m0-.78a1.748 1.748 0 1 0 0 3.496 1.748 1.748 0 0 0 0-3.496m0 6.969a.967.967 0 1 1 0 1.934.967.967 0 0 1 0-1.934m0-.78a1.748 1.748 0 1 0 0 3.496 1.748 1.748 0 0 0 0-3.496"
        />
      </svg>
    );
  if (language === 'javascript')
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <rect width="28" height="28" rx="2" fill="#f7df1e" />
        <text x="14" y="21" textAnchor="middle">
          JS
        </text>
      </svg>
    );
  if (language === 'node')
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path fill="#4e9b3e" d="m14 1 12 7v13l-12 7-12-7V8z" />
        <path
          fill="#22242b"
          d="M8 9h3v9c0 3-2 4-5 3l1-3c1 1 1 0 1-1zm6 1c2-2 7-1 7 2h-3c0-1-2-1-2 0 0 2 6 1 6 5 0 5-8 5-9 1l3-1c0 2 3 2 3 0 0-1-6-1-6-5 0-1 0-2 1-2z"
        />
      </svg>
    );
  if (language === 'python')
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path
          fill="#3776ab"
          d="M14 2c-6 0-6 3-6 7v3h7v2H5c-4 0-4 10 0 10h4v-5c0-3 2-5 5-5h5c2 0 4-2 4-5V7c0-3-3-5-9-5z"
        />
        <path
          fill="#ffd343"
          d="M14 26c6 0 6-3 6-7v-3h-7v-2h10c4 0 4-10 0-10h-4v5c0 3-2 5-5 5H9c-2 0-4 2-4 5v2c0 3 3 5 9 5z"
        />
        <circle cx="12" cy="6" r="1.2" fill="#fff" />
        <circle cx="16" cy="22" r="1.2" fill="#fff" />
      </svg>
    );
  if (language === 'java')
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path stroke="#e76f00" d="M14 3c5 5-5 6 1 11m-4-9c3 3-3 5 1 8" />
        <path
          stroke="#5382a1"
          d="M7 17c5 2 10 2 14 0M6 20c5 3 12 3 17 0M9 15h10l-1 9H10z"
        />
      </svg>
    );
  if (language === 'csharp')
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path fill="#68217a" d="m14 1 12 7v13l-12 7-12-7V8z" />
        <text x="14" y="19" textAnchor="middle" fill="#fff">
          C#
        </text>
      </svg>
    );
  if (language === 'php')
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <ellipse cx="14" cy="14" rx="13" ry="8" fill="#777bb4" />
        <text x="14" y="17" textAnchor="middle" fill="#151820">
          php
        </text>
      </svg>
    );
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <text x="14" y="18" textAnchor="middle" fill="#00add8">
        GO
      </text>
    </svg>
  );
}

function headerEntries(headers: string[] = []): [string, string][] {
  return headers.map((header) => {
    const separator = header.indexOf(':');
    return [header.slice(0, separator), header.slice(separator + 1).trim()];
  });
}

function quote(value: string): string {
  return JSON.stringify(value);
}

export function generateRequestSample(
  language: RequestSampleLanguage,
  request: RequestSampleValue,
): string {
  const headers = headerEntries(request.headers);
  const headerObject = Object.fromEntries(headers);
  const options = {
    method: request.method,
    headers: headerObject,
    ...(request.body ? { body: request.body } : {}),
  };

  if (language === 'curl') {
    const lines = [
      `curl --request ${request.method}`,
      `  --url '${request.url}'`,
    ];
    for (const [name, value] of headers)
      lines.push(`  --header '${name}: ${value}'`);
    if (request.body)
      lines.push(`  --data '${request.body.replaceAll("'", "'\\''")}'`);
    return lines.join(' \\\n');
  }
  if (language === 'javascript')
    return `const response = await fetch(${quote(request.url)}, ${JSON.stringify(options, null, 2)});\nconst data = await response.json();`;
  if (language === 'node')
    return `const response = await fetch(${quote(request.url)}, ${JSON.stringify(options, null, 2)});\n\nif (!response.ok) throw new Error(\`Request failed: \${response.status}\`);\nconst data = await response.json();`;
  if (language === 'python') {
    const args = [
      `${quote(request.url)}`,
      `headers=${JSON.stringify(headerObject)}`,
    ];
    if (request.body) args.push(`data=${quote(request.body)}`);
    return `import requests\n\nresponse = requests.${request.method.toLowerCase()}(\n    ${args.join(',\n    ')}\n)\nresponse.raise_for_status()\ndata = response.json()`;
  }
  if (language === 'java')
    return `var request = HttpRequest.newBuilder()\n    .uri(URI.create(${quote(request.url)}))${headers.map(([name, value]) => `\n    .header(${quote(name)}, ${quote(value)})`).join('')}\n    .method(${quote(request.method)}, ${request.body ? `HttpRequest.BodyPublishers.ofString(${quote(request.body)})` : 'HttpRequest.BodyPublishers.noBody()'})\n    .build();\nvar response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());`;
  if (language === 'csharp')
    return `using var request = new HttpRequestMessage(HttpMethod.${request.method[0] + request.method.slice(1).toLowerCase()}, ${quote(request.url)});${headers.map(([name, value]) => `\nrequest.Headers.TryAddWithoutValidation(${quote(name)}, ${quote(value)});`).join('')}${request.body ? `\nrequest.Content = new StringContent(${quote(request.body)});` : ''}\nvar response = await new HttpClient().SendAsync(request);`;
  if (language === 'php')
    return `$response = (new GuzzleHttp\\Client())->request(${quote(request.method)}, ${quote(request.url)}, [\n    'headers' => ${JSON.stringify(headerObject, null, 2).replaceAll('{', '[').replaceAll('}', ']').replaceAll(':', ' =>')},${request.body ? `\n    'body' => ${quote(request.body)},` : ''}\n]);`;
  return `req, err := http.NewRequest(${quote(request.method)}, ${quote(request.url)}, ${request.body ? `strings.NewReader(${quote(request.body)})` : 'nil'})\nif err != nil { log.Fatal(err) }${headers.map(([name, value]) => `\nreq.Header.Set(${quote(name)}, ${quote(value)})`).join('')}\nresponse, err := http.DefaultClient.Do(req)\nif err != nil { log.Fatal(err) }\ndefer response.Body.Close()`;
}

export function RequestSample({
  request,
  copyRequest = request,
  storageKey,
  className = '',
}: {
  request: RequestSampleValue;
  copyRequest?: RequestSampleValue;
  storageKey: string;
  className?: string;
}) {
  const [language, setLanguage] = useLocalState<RequestSampleLanguage>(
    storageKey,
    'curl',
  );
  const [expanded, setExpanded] = useState(false);
  const languageMenuRef = useRef<HTMLDetailsElement>(null);
  const selected =
    LANGUAGES.find((item) => item.value === language) ?? LANGUAGES[0]!;
  useEffect(() => {
    const closeFromOutside = (event: PointerEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node))
        languageMenuRef.current?.removeAttribute('open');
    };
    document.addEventListener('pointerdown', closeFromOutside);
    return () => document.removeEventListener('pointerdown', closeFromOutside);
  }, []);
  const chooseLanguage = (
    nextLanguage: RequestSampleLanguage,
    target: HTMLButtonElement,
  ) => {
    setLanguage(nextLanguage);
    target.closest('details')?.removeAttribute('open');
  };
  const languagePicker = (
    <details
      className={`sp-sample-language ${styles.language}`}
      ref={languageMenuRef}
    >
      <summary
        role="button"
        aria-label="Code sample language"
        aria-haspopup="listbox"
      >
        <LanguageIcon language={selected.value} />
        <span>{selected.label}</span>
        <DisclosureChevron />
      </summary>
      <div
        className={`sp-sample-language-menu ${styles.languageMenu}`}
        role="listbox"
        aria-label="Code sample language"
      >
        {LANGUAGES.map((item) => (
          <button
            type="button"
            role="option"
            aria-selected={item.value === selected.value}
            onClick={(event) => chooseLanguage(item.value, event.currentTarget)}
            key={item.value}
          >
            <LanguageIcon language={item.value} />
            <span>{item.label}</span>
            {item.value === selected.value && (
              <span className={`sp-sample-check ${styles.check}`}>✓</span>
            )}
          </button>
        ))}
      </div>
    </details>
  );
  const sample = generateRequestSample(selected.value, request);
  const copySample = generateRequestSample(selected.value, copyRequest);

  return (
    <section
      className={`sp-request-sample ${styles.sample} ${className}`.trim()}
    >
      <header className={`sp-request-sample-header ${styles.header}`}>
        <button
          type="button"
          className={`sp-request-sample-toggle ${styles.toggle}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <DisclosureChevron />
          <span>Code snippet</span>
        </button>
        {languagePicker}
      </header>
      {expanded && (
        <div className={`sp-request-sample-code ${styles.code}`}>
          <CopyButton value={copySample} compact />
          <CodeBlock value={sample} copyable={false} />
        </div>
      )}
    </section>
  );
}
