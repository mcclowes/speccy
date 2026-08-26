import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'getting-started',
    {
      type: 'category',
      label: 'Workflows',
      items: ['studio', 'test-api-requests', 'api-health', 'ci-review'],
    },
    {
      type: 'category',
      label: 'Integrations',
      items: ['react-renderer', 'operation-components', 'docusaurus'],
    },
    {
      type: 'category',
      label: 'Customize',
      items: ['configuration', 'openapi-support', 'openapi-extensions'],
    },
    'deployment',
  ],
};

export default sidebars;
