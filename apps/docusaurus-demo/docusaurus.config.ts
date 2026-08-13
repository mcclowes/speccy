import type { Config } from '@docusaurus/types';
import { getRemarkPlugin } from 'docusaurus-plugin-glossary';
import { fileURLToPath } from 'node:url';

const isVercel = process.env.VERCEL === '1';
const vercelHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const studioUrl = 'https://app.speccy.report';
const siteDir = fileURLToPath(new URL('.', import.meta.url));
const glossaryRoute = isVercel ? '/glossary' : '/speccy/glossary';
const privacyRoute = isVercel ? '/docs/privacy' : '/speccy/docs/privacy';

const glossaryRemarkPlugin = getRemarkPlugin(
  {
    glossaryPath: 'glossary/glossary.json',
    routePath: glossaryRoute,
  },
  { siteDir },
);

const config: Config = {
  title: 'Speccy',
  tagline: 'Explore, review, and publish OpenAPI.',
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
    'docusaurus-plugin-image-zoom',
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
    [
      'docusaurus-plugin-cookie-consent',
      {
        enabled: true,
        title: 'Cookies',
        description: `We use browser storage to remember your privacy preferences. Vercel Web Analytics is cookieless and always active. Read our [Privacy notice](${privacyRoute}) for details.`,
        links: [{ label: 'Privacy notice', href: privacyRoute }],
        storageKey: 'speccy-cookie-consent',
        toastMode: true,
        acceptAllText: 'Accept all',
        rejectOptionalText: 'Essential only',
        rejectAllText: 'Reject all',
        categories: {
          necessary: {
            label: 'Essential storage',
            description:
              'Required to remember your privacy and display preferences on this device.',
          },
          analytics: {
            label: 'Analytics cookies',
            description:
              'Reserved for optional cookie-based analytics. Speccy does not currently use these.',
          },
          marketing: {
            label: 'Marketing cookies',
            description: 'Currently not used on this site.',
            enabled: false,
          },
          functional: {
            label: 'Functional cookies',
            description: 'Currently not used on this site.',
            enabled: false,
          },
        },
      },
    ],
    [
      'docusaurus-plugin-glossary',
      {
        glossaryPath: 'glossary/glossary.json',
        routePath: glossaryRoute,
        autoLinkTerms: true,
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
          remarkPlugins: [glossaryRemarkPlugin],
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
          remarkPlugins: [glossaryRemarkPlugin],
        },
        theme: { customCss: './src/css/custom.css' },
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Speccy',
      logo: {
        alt: 'Speccy logo',
        src: 'favicon.svg',
      },
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
            { label: 'Glossary', to: '/glossary' },
            { label: 'Updates', to: '/updates' },
          ],
        },
        {
          title: 'Explore',
          items: [
            { label: 'Live API example', to: '/api' },
            { label: 'Extensions', to: '/docs/openapi-extensions' },
            { label: 'Privacy', to: '/docs/privacy' },
            { label: 'GitHub', href: 'https://github.com/mcclowes/speccy' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Speccy. Built with Docusaurus.`,
    },
    imageZoom: {
      selector: '.theme-doc-markdown img:not([data-no-zoom])',
      options: {
        margin: 32,
        background: 'var(--ifm-background-color)',
        scrollOffset: 40,
      },
    },
  },
};

export default config;
