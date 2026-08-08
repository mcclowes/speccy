import fs from 'node:fs';
import { LineCounter, parseDocument } from 'yaml';

const markerPrefix = '<!-- speccy-health:';
const severityOrder = { issue: 0, warning: 1, suggestion: 2 };

export function addedLines(patch = '') {
  const added = new Set();
  let revisionLine = 0;
  for (const line of patch.split('\n')) {
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      revisionLine = Number(hunk[1]);
      continue;
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      added.add(revisionLine);
      revisionLine += 1;
    } else if (!line.startsWith('-')) {
      revisionLine += 1;
    }
  }
  return added;
}

export function diagnosticLine(document, lineCounter, path) {
  let candidate = [...path];
  while (candidate.length > 0) {
    const node = document.getIn(candidate, true);
    if (node?.range) return lineCounter.linePos(node.range[0]).line;
    candidate = candidate.slice(0, -1);
  }
  return undefined;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function commentFor(path, line, diagnostics) {
  const sorted = [...diagnostics].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const counts = Object.keys(severityOrder)
    .map((severity) => [severity, sorted.filter((item) => item.severity === severity).length])
    .filter(([, count]) => count > 0);
  const key = `${path}:${line}`;
  const lines = [
    `${markerPrefix}${key} -->`,
    '',
    `**API health: ${counts.map(([severity, count]) => plural(count, severity)).join(', ')}**`,
    '',
  ];
  for (const diagnostic of sorted) {
    lines.push(`- \`${diagnostic.ruleId}\`: ${diagnostic.message}${diagnostic.suggestion ? ` ${diagnostic.suggestion}` : ''}`);
  }
  return lines.join('\n');
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`GitHub ${options.method ?? 'GET'} ${path} failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? undefined : response.json();
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const pullNumber = process.env.PR_NUMBER;
  const commitId = process.env.COMMIT_SHA;
  const specPath = process.env.SPEC_PATH;
  const reportPath = process.env.REPORT_PATH;
  if (!repository || !pullNumber || !commitId || !specPath || !reportPath || !process.env.GH_TOKEN) {
    throw new Error('GITHUB_REPOSITORY, PR_NUMBER, COMMIT_SHA, SPEC_PATH, REPORT_PATH, and GH_TOKEN are required.');
  }

  const [files, existingComments] = await Promise.all([
    github(`/repos/${repository}/pulls/${pullNumber}/files?per_page=100`),
    github(`/repos/${repository}/pulls/${pullNumber}/comments?per_page=100`),
  ]);
  const patch = files.find((file) => file.filename === specPath)?.patch;
  const changedLines = addedLines(patch);
  const source = fs.readFileSync(specPath, 'utf8');
  const lineCounter = new LineCounter();
  const document = parseDocument(source, { lineCounter });
  const diagnostics = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const byLine = new Map();
  for (const diagnostic of diagnostics) {
    const line = diagnostic.range?.start?.line !== undefined
      ? diagnostic.range.start.line + 1
      : diagnosticLine(document, lineCounter, diagnostic.path);
    if (!line || !changedLines.has(line)) continue;
    byLine.set(line, [...(byLine.get(line) ?? []), diagnostic]);
  }

  const expectedMarkers = new Set([...byLine.keys()].map((line) => `${markerPrefix}${specPath}:${line} -->`));
  for (const comment of existingComments) {
    if (comment.body?.startsWith(markerPrefix) && !expectedMarkers.has(comment.body.split('\n')[0])) {
      await github(`/repos/${repository}/pulls/comments/${comment.id}`, { method: 'DELETE' });
    }
  }

  for (const [line, findings] of byLine) {
    const body = commentFor(specPath, line, findings);
    const marker = body.split('\n')[0];
    const existing = existingComments.find((comment) => comment.body?.startsWith(marker));
    if (existing) {
      if (existing.body !== body) {
        await github(`/repos/${repository}/pulls/comments/${existing.id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
      }
    } else {
      await github(`/repos/${repository}/pulls/${pullNumber}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body, commit_id: commitId, path: specPath, line, side: 'RIGHT' }),
      });
    }
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
