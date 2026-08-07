import type { Config } from '@docusaurus/types';

const config: Config = {
  title: 'Speccy',
  tagline: 'OpenAPI reference docs with room to breathe.',
  url: 'https://mcclowes.github.io',
  baseUrl: '/speccy/',
  organizationName: 'mcclowes',
  projectName: 'speccy',
  favicon: 'favicon.svg',
  onBrokenLinks: 'throw',
  plugins: [
    [
      '@speccy/docusaurus',
      {
        route: '/speccy/api',
        spec: './static/openapi.yaml',
        renderer: { accentColor: '#6d5dfc', theme: 'system' },
      },
    ],
  ],
  presets: [
    ['classic', {
      docs: {
        routeBasePath: 'docs',
        sidebarPath: './sidebars.ts',
      },
      blog: false,
      theme: { customCss: './src/css/custom.css' },
    }],
  ],
  themeConfig: {
    navbar: {
      title: 'Speccy',
      items: [
        { to: '/docs/getting-started', label: 'Docs', position: 'right' },
        { to: '/api', label: 'Live example', position: 'right' },
        { href: 'https://github.com/mcclowes/speccy', label: 'GitHub', position: 'right' },
      ],
    },
    colorMode: { respectPrefersColorScheme: true },
    footer: {
      style: 'dark',
      links: [
        { title: 'Learn', items: [
          { label: 'Get started', to: '/docs/getting-started' },
          { label: 'React renderer', to: '/docs/react-renderer' },
          { label: 'Docusaurus', to: '/docs/docusaurus' },
        ] },
        { title: 'Explore', items: [
          { label: 'Live API example', to: '/api' },
          { label: 'Extensions', to: '/docs/openapi-extensions' },
          { label: 'GitHub', href: 'https://github.com/mcclowes/speccy' },
        ] },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Speccy. Built with Docusaurus.`,
    },
  },
};

export default config;
