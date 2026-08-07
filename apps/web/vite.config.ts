import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: [
      { find: /^@speccy\/renderer\/styles\.css$/, replacement: fileURLToPath(new URL('../../packages/renderer/src/styles.css', import.meta.url)) },
      { find: /^@speccy\/renderer$/, replacement: fileURLToPath(new URL('../../packages/renderer/src/index.ts', import.meta.url)) },
    ],
  },
  build: {
    sourcemap: true,
  },
});
