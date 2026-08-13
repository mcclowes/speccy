/**
 * ---
 * purpose: Docusaurus plugin that exports each docs page as plain markdown with rewritten links.
 * related:
 *   - ../../docusaurus.config.ts - Registers this plugin for the demo site.
 * ---
 */

import fs from 'node:fs';
import path from 'node:path';

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) return files;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('_partials') || entry.name === 'assets') continue;

    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(filePath, files);
    } else if (/\.mdx?$/.test(entry.name)) {
      files.push(filePath);
    }
  }

  return files;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, content: raw };

  const data = {};
  for (const line of match[1].split('\n')) {
    const entry = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!entry) continue;

    let value = entry[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[entry[1]] = value;
  }

  return { data, content: raw.slice(match[0].length) };
}

function deriveRoute(docsDirectory, filePath, slug, routeBasePath) {
  if (slug?.startsWith('/')) return path.posix.join(routeBasePath, slug);

  const relativePath = path.relative(docsDirectory, filePath);
  return path.posix
    .join(routeBasePath, relativePath.replace(/\.mdx?$/, ''))
    .replace(/(^|\/)index$/, '');
}

const MARKDOWN_LINK = /(\]\()([^)\s]+)(\s+"[^"]*")?\)/g;

function rewriteMarkdownLinks(
  content,
  sourceFilePath,
  docsDirectory,
  sourceRoute,
  routeBasePath,
) {
  const sourceDirectory = path.dirname(sourceFilePath);
  const outputDirectory = sourceRoute.replace(/\/+$/, '') || '/';

  return content.replace(MARKDOWN_LINK, (match, open, target, title = '') => {
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) return match;

    const hashIndex = target.indexOf('#');
    const pathPart = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
    const anchor = hashIndex >= 0 ? target.slice(hashIndex) : '';
    if (!/\.mdx?$/i.test(pathPart)) return match;

    if (pathPart.startsWith('/')) {
      const outputPath = pathPart.replace(/\.mdx?$/i, '').replace(/\/+$/, '');
      return `${open}${outputPath}/index.md${anchor}${title})`;
    }

    const targetPath = path.resolve(sourceDirectory, pathPart);
    const relativeTarget = path.relative(docsDirectory, targetPath);
    if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
      return match;
    }
    if (
      relativeTarget
        .split(path.sep)
        .some(
          (segment) => segment.startsWith('_partials') || segment === 'assets',
        )
    ) {
      return match;
    }

    let targetSlug;
    try {
      targetSlug = parseFrontmatter(fs.readFileSync(targetPath, 'utf8')).data
        .slug;
    } catch {
      targetSlug = undefined;
    }

    const targetRoute = deriveRoute(
      docsDirectory,
      targetPath,
      targetSlug,
      routeBasePath,
    );
    const outputFile = path.posix.join(
      targetRoute.replace(/\/+$/, '') || '/',
      'index.md',
    );
    const relativeUrl = path.posix.relative(outputDirectory, outputFile);
    return `${open}${relativeUrl}${anchor}${title})`;
  });
}

function writeMarkdownFile(outputDirectory, route, content) {
  const cleanRoute = route.replace(/\/+$/, '') || '/';
  const filePath = path.join(outputDirectory, cleanRoute, 'index.md');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

export default function markdownExportPlugin(_context, options = {}) {
  return {
    name: 'docusaurus-plugin-markdown-export',

    postBuild({ siteDir, outDir }) {
      for (const config of options.docsConfigs ?? []) {
        const docsDirectory = path.resolve(siteDir, config.path);
        for (const filePath of walk(docsDirectory)) {
          const raw = fs.readFileSync(filePath, 'utf8');
          const { data, content } = parseFrontmatter(raw);
          const route = deriveRoute(
            docsDirectory,
            filePath,
            data.slug,
            config.routeBasePath,
          );
          const title =
            data.title || data.sidebar_label || path.basename(filePath);
          const source = path.relative(siteDir, filePath).replaceAll('\\', '/');
          const titleHeader = content.trimStart().startsWith('# ')
            ? ''
            : `# ${title}\n\n`;
          const header = `${titleHeader}> Source: ${source}\n\n`;
          const rewritten = rewriteMarkdownLinks(
            content,
            filePath,
            docsDirectory,
            route,
            config.routeBasePath,
          );
          writeMarkdownFile(outDir, route, header + rewritten);
        }
      }
    },
  };
}
