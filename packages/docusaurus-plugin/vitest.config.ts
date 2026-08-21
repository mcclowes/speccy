import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@docusaurus/useGlobalData': fileURLToPath(
        new URL('./src/testDocusaurusGlobalData.ts', import.meta.url),
      ),
      'speccy-spectral': fileURLToPath(
        new URL('../spectral/src/index.ts', import.meta.url),
      ),
    },
  },
});
