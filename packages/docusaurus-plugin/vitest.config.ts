import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'speccy-spectral': fileURLToPath(new URL('../spectral/src/index.ts', import.meta.url)),
    },
  },
});
