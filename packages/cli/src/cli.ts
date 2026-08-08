/**
 * ---
 * purpose: Binds the CLI to real process input, output, and exit codes.
 * related:
 *   - ./run.ts - Holds the behavior this thin wrapper invokes.
 * ---
 */

import { run } from './run';
import { nodeSourceIO } from './sources';

const color = process.stdout.isTTY === true && !process.env.NO_COLOR;

process.exitCode = await run(process.argv.slice(2), {
  io: nodeSourceIO,
  write: (text) => process.stdout.write(text),
  writeError: (text) => process.stderr.write(text),
  color,
});
