import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/docs.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  external: ['react', 'react-dom'],
  loader: { '.css': 'local-css' },
});
