import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest config séparé de vite.config.ts pour éviter le process.exit(1)
 * lié à VITE_FOLDER_NAME qui n'est pas nécessaire pour les tests.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    server: {
      deps: {
        // Force Vite à transformer les modules CJS (lodash, @hakit/*...)
        inline: ['@hakit/core', '@hakit/components', 'lodash'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.stories.tsx', 'src/main.tsx', 'src/test/**'],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 30,
      },
    },
  },
});
