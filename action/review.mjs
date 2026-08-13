import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

export const reportMarker = '<!-- speccy-report -->';

export function parseSpecs(value) {
  const specs = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf('=');
      if (separator < 1 || separator === line.length - 1) {
        throw new Error(`Invalid spec "${line}". Use name=path.`);
      }
      const name = line.slice(0, separator).trim();
      const paths = line
        .slice(separator + 1)
        .split('=>')
        .map((path) => path.trim());
      if (paths.length > 2 || paths.some((path) => !path)) {
        throw new Error(
          `Invalid spec "${line}". Use name=path or name=base-path=>revision-path.`,
        );
      }
      return paths.length === 1
        ? { name, revisionPath: paths[0] }
        : { name, basePath: paths[0], revisionPath: paths[1] };
    });
  if (specs.length === 0) throw new Error('At least one spec is required.');
  return specs;
}

export function composeReport(results) {
  const lines = [reportMarker, '', '## Speccy API review', ''];
  for (const result of results) {
    lines.push(
      `### ${result.name}`,
      '',
      result.diff.trim(),
      '',
      result.health.trim(),
      '',
    );
  }
  return `${lines.join('\n').trim()}\n`;
}

export function runCli(args, version) {
  const result = spawnSync('npx', ['--yes', `speccy-cli@${version}`, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status === 2)
    throw new Error(result.stderr.trim() || 'Speccy could not run.');
  return { output: result.stdout, status: result.status ?? 2 };
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
  if (!response.ok) {
    throw new Error(
      `GitHub ${options.method ?? 'GET'} ${path} failed: ${response.status} ${await response.text()}`,
    );
  }
  return response.status === 204 ? undefined : response.json();
}

async function publishComment(repository, pullNumber, body) {
  const comments = await github(
    `/repos/${repository}/issues/${pullNumber}/comments?per_page=100`,
  );
  const existing = comments.find((comment) =>
    comment.body?.startsWith(reportMarker),
  );
  if (existing) {
    if (existing.body !== body) {
      await github(`/repos/${repository}/issues/comments/${existing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      });
    }
    return;
  }
  await github(`/repos/${repository}/issues/${pullNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function review({
  specs,
  version,
  baseRef,
  failOn,
  healthFailOn,
}) {
  const results = [];
  let exitCode = 0;
  for (const spec of specs) {
    const diff = runCli(
      [
        'diff',
        spec.basePath ?? `${baseRef}:${spec.revisionPath}`,
        spec.revisionPath,
        '--format',
        'markdown',
        '--fail-on',
        failOn,
      ],
      version,
    );
    const health = runCli(
      [
        'lint',
        spec.revisionPath,
        '--against',
        spec.basePath ?? `${baseRef}:${spec.revisionPath}`,
        '--format',
        'markdown',
        '--fail-on',
        healthFailOn,
      ],
      version,
    );
    exitCode = Math.max(exitCode, diff.status, health.status);
    results.push({ ...spec, diff: diff.output, health: health.output });
  }
  return { report: composeReport(results), exitCode };
}

async function main() {
  const event = JSON.parse(
    fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'),
  );
  if (!event.pull_request)
    throw new Error('Speccy API review must run on a pull_request event.');
  const specs = parseSpecs(process.env.SPECCY_SPECS ?? '');
  const result = await review({
    specs,
    version: process.env.SPECCY_VERSION ?? 'latest',
    baseRef: `origin/${event.pull_request.base.ref}`,
    failOn: process.env.SPECCY_FAIL_ON ?? 'breaking',
    healthFailOn: process.env.SPECCY_HEALTH_FAIL_ON ?? 'never',
  });
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.report);
  if (process.env.SPECCY_COMMENT !== 'false') {
    if (!process.env.GH_TOKEN)
      throw new Error('github-token is required when comment is true.');
    await publishComment(
      process.env.GITHUB_REPOSITORY,
      event.pull_request.number,
      result.report,
    );
  }
  process.exitCode = result.exitCode;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 2;
  });
}
