#!/usr/bin/env node

import { cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = dirname(fileURLToPath(import.meta.url));

export function packageNameFor(directory) {
  return (
    basename(resolve(directory))
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'speccy-reference'
  );
}

export async function createReference(directory) {
  const target = resolve(directory);
  await mkdir(dirname(target), { recursive: true });
  await cp(join(packageDirectory, 'template'), target, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  await rename(join(target, 'gitignore'), join(target, '.gitignore'));

  const packagePath = join(target, 'package.json');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  packageJson.name = packageNameFor(target);
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  return target;
}

async function main() {
  const directory = process.argv[2];
  if (!directory || directory === '--help' || directory === '-h') {
    console.log('Usage: npm create speccy-reference <directory>');
    process.exitCode = directory ? 0 : 1;
    return;
  }

  try {
    const target = await createReference(directory);
    console.log(`Created a Speccy reference in ${target}`);
    console.log(`\n  cd ${directory}\n  npm install\n  npm run dev`);
  } catch (error) {
    console.error(
      error?.code === 'ERR_FS_CP_EEXIST'
        ? `Couldn’t create ${directory}: the directory contains files from the template.`
        : error instanceof Error
          ? error.message
          : error,
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
