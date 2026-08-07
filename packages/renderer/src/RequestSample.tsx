/**
 * ---
 * purpose: Generates request snippets and renders the persistent language selector shared by API operations.
 * related:
 *   - ./Speccy.tsx - Supplies live request values to the sample.
 *   - ./CodeBlock.tsx - Presents and copies the generated snippet.
 * ---
 */

import { CodeBlock } from './CodeBlock';
import { useLocalState } from './useLocalState';

export type RequestSampleLanguage = 'curl' | 'javascript' | 'node' | 'python' | 'java' | 'csharp' | 'php' | 'go';

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

function headerEntries(headers: string[] = []): [string, string][] {
  return headers.map((header) => {
    const separator = header.indexOf(':');
    return [header.slice(0, separator), header.slice(separator + 1).trim()];
  });
}

function quote(value: string): string {
  return JSON.stringify(value);
}

export function generateRequestSample(language: RequestSampleLanguage, request: RequestSampleValue): string {
  const headers = headerEntries(request.headers);
  const headerObject = Object.fromEntries(headers);
  const options = { method: request.method, headers: headerObject, ...(request.body ? { body: request.body } : {}) };

  if (language === 'curl') {
    const lines = [`curl --request ${request.method}`, `  --url '${request.url}'`];
    for (const [name, value] of headers) lines.push(`  --header '${name}: ${value}'`);
    if (request.body) lines.push(`  --data '${request.body.replaceAll("'", "'\\''")}'`);
    return lines.join(' \\\n');
  }
  if (language === 'javascript') return `const response = await fetch(${quote(request.url)}, ${JSON.stringify(options, null, 2)});\nconst data = await response.json();`;
  if (language === 'node') return `const response = await fetch(${quote(request.url)}, ${JSON.stringify(options, null, 2)});\n\nif (!response.ok) throw new Error(\`Request failed: \${response.status}\`);\nconst data = await response.json();`;
  if (language === 'python') {
    const args = [`${quote(request.url)}`, `headers=${JSON.stringify(headerObject)}`];
    if (request.body) args.push(`data=${quote(request.body)}`);
    return `import requests\n\nresponse = requests.${request.method.toLowerCase()}(\n    ${args.join(',\n    ')}\n)\nresponse.raise_for_status()\ndata = response.json()`;
  }
  if (language === 'java') return `var request = HttpRequest.newBuilder()\n    .uri(URI.create(${quote(request.url)}))${headers.map(([name, value]) => `\n    .header(${quote(name)}, ${quote(value)})`).join('')}\n    .method(${quote(request.method)}, ${request.body ? `HttpRequest.BodyPublishers.ofString(${quote(request.body)})` : 'HttpRequest.BodyPublishers.noBody()'})\n    .build();\nvar response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());`;
  if (language === 'csharp') return `using var request = new HttpRequestMessage(HttpMethod.${request.method[0] + request.method.slice(1).toLowerCase()}, ${quote(request.url)});${headers.map(([name, value]) => `\nrequest.Headers.TryAddWithoutValidation(${quote(name)}, ${quote(value)});`).join('')}${request.body ? `\nrequest.Content = new StringContent(${quote(request.body)});` : ''}\nvar response = await new HttpClient().SendAsync(request);`;
  if (language === 'php') return `$response = (new GuzzleHttp\\Client())->request(${quote(request.method)}, ${quote(request.url)}, [\n    'headers' => ${JSON.stringify(headerObject, null, 2).replaceAll('{', '[').replaceAll('}', ']').replaceAll(':', ' =>')},${request.body ? `\n    'body' => ${quote(request.body)},` : ''}\n]);`;
  return `req, err := http.NewRequest(${quote(request.method)}, ${quote(request.url)}, ${request.body ? `strings.NewReader(${quote(request.body)})` : 'nil'})\nif err != nil { log.Fatal(err) }${headers.map(([name, value]) => `\nreq.Header.Set(${quote(name)}, ${quote(value)})`).join('')}\nresponse, err := http.DefaultClient.Do(req)\nif err != nil { log.Fatal(err) }\ndefer response.Body.Close()`;
}

export function RequestSample({ request, copyRequest = request, storageKey, className = '' }: {
  request: RequestSampleValue;
  copyRequest?: RequestSampleValue;
  storageKey: string;
  className?: string;
}) {
  const [language, setLanguage] = useLocalState<RequestSampleLanguage>(storageKey, 'curl');
  const selected = LANGUAGES.find((item) => item.value === language) ?? LANGUAGES[0]!;
  const title = <label className="sp-sample-language"><span className="sp-visually-hidden">Code sample language</span><select aria-label="Code sample language" value={selected.value} onChange={(event) => setLanguage(event.target.value as RequestSampleLanguage)}>{LANGUAGES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>;
  return <CodeBlock className={className} title={title} value={generateRequestSample(selected.value, request)} copyValue={generateRequestSample(selected.value, copyRequest)} />;
}
