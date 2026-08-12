import { readFile, unlink, writeFile } from 'node:fs/promises';

const globalStyles = await readFile('src/styles.css', 'utf8');
const moduleStyles = await Promise.all(
  ['dist/index.css', 'dist/docs.css'].map(async (path) =>
    (await readFile(path, 'utf8')).replace(
      /\n?\/\*# sourceMappingURL=.*?\*\/\s*$/,
      '',
    ),
  ),
);

await writeFile(
  'dist/styles.css',
  `${globalStyles.trimEnd()}\n\n${moduleStyles.map((styles) => styles.trim()).join('\n\n')}\n`,
);
await Promise.all([
  unlink('dist/index.css'),
  unlink('dist/index.css.map').catch(() => undefined),
  unlink('dist/docs.css'),
  unlink('dist/docs.css.map').catch(() => undefined),
]);
