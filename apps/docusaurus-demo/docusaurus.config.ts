import type { Config } from '@docusaurus/types';
import { fileURLToPath } from 'node:url';

const isVercel = process.env.VERCEL === '1';
const vercelHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const studioUrl = vercelHost ? `https://${vercelHost}` : undefined;

const config: Config = {
  title: 'Speccy',
  tagline: 'OpenAPI reference docs with room to breathe.',
  url:
    isVercel && vercelHost
      ? `https://${vercelHost}`
      : 'https://mcclowes.github.io',
  baseUrl: isVercel ? '/' : '/speccy/',
  organizationName: 'mcclowes',
  projectName: 'speccy',
  favicon: 'favicon.svg',
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  onDuplicateRoutes: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  customFields: { studioUrl },
  plugins: [
    [
      'docusaurus-plugin-speccy',
      {
        route: isVercel ? '/api' : '/speccy/api',
        spec: './static/openapi.yaml',
        renderer: { accentColor: '#6d5dfc', theme: 'inherit' },
      },
    ],
    [
      fileURLToPath(
        new URL('./plugins/markdown-export/index.mjs', import.meta.url),
      ),
      {
        docsConfigs: [{ path: 'docs', routeBasePath: '/docs' }],
      },
    ],
  ],
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
        },
        sitemap: {
          lastmod: 'date',
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/updates/tags/**'],
          filename: 'sitemap.xml',
          createSitemapItems: async (params) => {
            const { defaultCreateSitemapItems, ...rest } = params;
            const items = await defaultCreateSitemapItems(rest);
            return items.filter(
              (item) =>
                !item.url.includes('/page/') &&
                !item.url.includes('/updates/tags'),
            );
          },
        },
        blog: {
          routeBasePath: 'updates',
          blogTitle: 'Speccy updates',
          blogDescription:
            'Release notes, migration guidance, design notes, and practical API documentation tips.',
          showReadingTime: true,
          postsPerPage: 10,
          feedOptions: {
            type: ['rss', 'atom'],
            title: 'Speccy updates',
            description:
              'Release notes, migration guidance, design notes, and practical API documentation tips.',
          },
        },
        theme: { customCss: './src/css/custom.css' },
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Speccy',
      items: [
        { to: '/docs/getting-started', label: 'Docs', position: 'right' },
        { to: '/updates', label: 'Updates', position: 'right' },
        { to: '/api', label: 'Live example', position: 'right' },
        ...(studioUrl
          ? [{ href: studioUrl, label: 'Studio', position: 'right' as const }]
          : []),
        {
          href: 'https://github.com/mcclowes/speccy',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    colorMode: { respectPrefersColorScheme: true },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            { label: 'Get started', to: '/docs/getting-started' },
            { label: 'React renderer', to: '/docs/react-renderer' },
            { label: 'Docusaurus', to: '/docs/docusaurus' },
            { label: 'Updates', to: '/updates' },
          ],
        },
        {
          title: 'Explore',
          items: [
            { label: 'Live API example', to: '/api' },
            { label: 'Extensions', to: '/docs/openapi-extensions' },
            { label: 'GitHub', href: 'https://github.com/mcclowes/speccy' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Speccy. Built with Docusaurus.`,
    },
  },
};

export default config;
