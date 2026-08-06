import type { Config } from '@docusaurus/types';

const config: Config = {
  title: 'Speccy docs',
  tagline: 'OpenAPI, beautifully clear.',
  url: 'https://speccy.example',
  baseUrl: '/',
  favicon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22><text y=%2226%22 font-size=%2228%22>◒</text></svg>',
  onBrokenLinks: 'throw',
  plugins: [
    [
      '@speccy/docusaurus',
      {
        route: '/api',
        spec: './static/openapi.yaml',
        renderer: { accentColor: '#6d5dfc', theme: 'system' },
      },
    ],
  ],
  presets: [
    ['classic', { docs: false, blog: false, theme: { customCss: './src/css/custom.css' } }],
  ],
  themeConfig: {
    navbar: {
      title: 'Speccy',
      items: [{ to: '/api', label: 'API reference', position: 'left' }],
    },
    colorMode: { respectPrefersColorScheme: true },
  },
};

export default config;

