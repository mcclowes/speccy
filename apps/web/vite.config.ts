import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  resolve: {
    alias: [
      {
        find: /^speccy-renderer\/styles\.css$/,
        replacement: fileURLToPath(
          new URL('../../packages/renderer/src/styles.css', import.meta.url),
        ),
      },
      {
        find: /^speccy-renderer$/,
        replacement: fileURLToPath(
          new URL('../../packages/renderer/src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^speccy-spectral$/,
        replacement: fileURLToPath(
          new URL('../../packages/spectral/src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^speccy-core$/,
        replacement: fileURLToPath(
          new URL('../../packages/core/src/index.ts', import.meta.url),
        ),
      },
      ...(mode === 'test'
        ? []
        : [
            {
              find: /^(?:node:)?buffer$/,
              replacement: fileURLToPath(
                new URL('./src/browser-node/buffer.ts', import.meta.url),
              ),
            },
            {
              find: /^(?:node:)?path$/,
              replacement: fileURLToPath(
                new URL('./src/browser-node/path.ts', import.meta.url),
              ),
            },
            {
              find: /^(?:node:)?fs$/,
              replacement: fileURLToPath(
                new URL('./src/browser-node/fs.ts', import.meta.url),
              ),
            },
          ]),
    ],
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (
            id.includes('react-dom') ||
            id.includes('/react/') ||
            id.includes('/scheduler/')
          ) {
            return 'react';
          }

          if (id.includes('/yaml/')) {
            return 'yaml';
          }

          return 'vendor';
        },
      },
    },
  },
}));
