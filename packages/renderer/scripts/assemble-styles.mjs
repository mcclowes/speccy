import { readFile, unlink, writeFile } from 'node:fs/promises';

const globalStyles = await readFile('src/styles.css', 'utf8');
const moduleStyles = await readFile('dist/index.css', 'utf8');

await writeFile(
  'dist/styles.css',
  `${globalStyles.trimEnd()}\n\n${moduleStyles.trim()}\n`,
);
await Promise.all([
  unlink('dist/index.css'),
  unlink('dist/index.css.map').catch(() => undefined),
]);
