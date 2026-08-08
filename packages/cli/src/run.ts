/**
 * ---
 * purpose: Parses arguments, runs the requested analysis, and picks an exit code.
 * related:
 *   - ./sources.ts - Resolves each spec argument to source text.
 *   - ./report.ts - Renders the result and decides what counts as a failure.
 * ---
 */

import { parseArgs } from 'node:util';
import { analyzeOpenApi, diffSpecs, parseSpec } from 'speccy-core';
import { diffExitCode, formatDiff, formatLint, lintExitCode, type DiffThreshold, type Format, type LintThreshold } from './report';
import { readSource, type SourceIO } from './sources';

/** Reserved for the tool itself failing, so CI can tell a broken spec from a breaking change. */
const TOOL_FAILURE = 2;

const FORMATS: Format[] = ['pretty', 'json', 'markdown'];
const DIFF_THRESHOLDS: DiffThreshold[] = ['breaking', 'warning', 'compatible', 'documentation', 'never'];
const LINT_THRESHOLDS: LintThreshold[] = ['issue', 'warning', 'suggestion', 'never'];

const USAGE = `speccy - OpenAPI review for the command line

Usage:
  speccy lint <spec> [options]
  speccy diff <base> <revision> [options]

Each spec may be a file path, a git ref such as main:openapi.yaml, or an https URL.

Options:
  --format <pretty|json|markdown>   Output shape. Defaults to pretty.
  --fail-on <severity>              Exit 1 at or above this severity.
                                    lint: issue, warning, suggestion, never. Defaults to issue.
                                    diff: breaking, warning, compatible, documentation, never. Defaults to breaking.
  --against <spec>                  Adds change-safety findings to a lint.
  --no-color                        Never colorize terminal output.
  --help                            Show this message.

Exit codes:
  0  nothing at or above the threshold
  1  findings at or above the threshold
  2  the tool could not run`;

export interface RunIO {
  io: SourceIO;
  write: (text: string) => void;
  writeError: (text: string) => void;
  color?: boolean;
}

function choose<T extends string>(value: string | undefined, allowed: T[], fallback: T, flag: string): T {
  if (value === undefined) return fallback;
  if (!allowed.includes(value as T)) throw new Error(`Unsupported ${flag} "${value}". Use one of ${allowed.join(', ')}.`);
  return value as T;
}

export async function run(argv: string[], { io, write, writeError, color = false }: RunIO): Promise<number> {
  let positionals: string[];
  let values: Record<string, unknown>;
  try {
    ({ positionals, values } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        format: { type: 'string' },
        'fail-on': { type: 'string' },
        against: { type: 'string' },
        color: { type: 'boolean', default: true },
        help: { type: 'boolean', short: 'h' },
      },
    }));
  } catch (error) {
    writeError(`${(error as Error).message}\n`);
    return TOOL_FAILURE;
  }

  const [command, ...rest] = positionals;
  if (values.help || command === undefined) {
    write(`${USAGE}\n`);
    return 0;
  }

  try {
    const format = choose(values.format as string | undefined, FORMATS, 'pretty', '--format');
    const options = { color: color && values.color !== false };

    if (command === 'lint') {
      const [target] = rest;
      if (!target) throw new Error('speccy lint needs a spec. See --help.');
      const threshold = choose(values['fail-on'] as string | undefined, LINT_THRESHOLDS, 'issue', '--fail-on');
      const source = await readSource(target, io);
      if (source === undefined) throw new Error(`No spec at ${target}.`);

      const previousSource = values.against ? await readSource(values.against as string, io) : undefined;
      const diagnostics = analyzeOpenApi(parseSpec(source), previousSource ? { previousDocument: parseSpec(previousSource) } : {});
      write(formatLint(diagnostics, format, options));
      return lintExitCode(diagnostics, threshold);
    }

    if (command === 'diff') {
      const [baseTarget, revisionTarget] = rest;
      if (!baseTarget || !revisionTarget) throw new Error('speccy diff needs a base and a revision. See --help.');
      const threshold = choose(values['fail-on'] as string | undefined, DIFF_THRESHOLDS, 'breaking', '--fail-on');

      const baseSource = await readSource(baseTarget, io);
      if (baseSource === undefined) {
        write(`No base spec at ${baseTarget}, so there is nothing to compare. Treating this as a new document.\n`);
        return 0;
      }
      const revisionSource = await readSource(revisionTarget, io);
      if (revisionSource === undefined) throw new Error(`No spec at ${revisionTarget}.`);

      const report = diffSpecs(parseSpec(baseSource), parseSpec(revisionSource), {
        base: { source: baseTarget },
        revision: { source: revisionTarget },
      });
      write(formatDiff(report, format, options));
      return diffExitCode(report, threshold);
    }

    throw new Error(`Unknown command "${command}". See --help.`);
  } catch (error) {
    writeError(`${(error as Error).message}\n`);
    return TOOL_FAILURE;
  }
}
