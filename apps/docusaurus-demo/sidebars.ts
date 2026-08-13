import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'getting-started',
    {
      type: 'category',
      label: 'Integrations',
      items: ['react-renderer', 'docusaurus', 'ci-review'],
    },
    {
      type: 'category',
      label: 'Customize',
      items: ['configuration', 'openapi-extensions'],
    },
    'deployment',
  ],
};

export default sidebars;
