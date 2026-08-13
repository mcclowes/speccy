import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'getting-started',
    'studio',
    {
      type: 'category',
      label: 'Integrations',
      items: [
        'react-renderer',
        'operation-components',
        'docusaurus',
        'ci-review',
      ],
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
