import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import path from 'path';

import dotenv from 'dotenv';
dotenv.config();

// Build mode flags
// VITE_ADDON=true      → SPA via HA ingress (MUST use relative paths './' so asset
//                        URLs resolve under /api/hassio_ingress/<token>/)
// VITE_HACS_PANEL=true → IIFE bundle for Python integration (Level 2, self-contained JS)
// VITE_HACS=true       → SPA with relative paths for HACS frontend category (Level 1)
// (default)            → SPA with absolute paths for SSH deployment
const isAddon = process.env.VITE_ADDON === 'true';
const isHACSPanel = process.env.VITE_HACS_PANEL === 'true';
const useRelativePaths = process.env.VITE_HACS === 'true';
const VITE_FOLDER_NAME = process.env.VITE_FOLDER_NAME || 'community/ha-react-dashboard';
// Addon MUST use './' — ingress rewrites the path prefix so absolute '/'
// would point to HA itself instead of the add-on container.
const basePath = isAddon ? './' : useRelativePaths ? './' : `/local/${VITE_FOLDER_NAME}/`;

// Mock-HA mode: replace @hakit/* with local mocks for E2E testing
const isMockHA = process.env.VITE_MOCK_HA === 'true';

// https://vite.dev/config/
export default defineConfig({
  base: isHACSPanel ? './' : basePath,
  plugins: [
    react(),
    tailwindcss(),
    // In panel mode, inject CSS into the JS bundle to produce a single self-contained file
    ...(isHACSPanel ? [cssInjectedByJsPlugin()] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // When VITE_MOCK_HA=true, replace @hakit packages with local mocks
      // so the dashboard renders with fake entities (no real HA required).
      ...(isMockHA
        ? {
            '@hakit/core': path.resolve(__dirname, 'tests/mocks/hakit-core.tsx'),
            '@hakit/components': path.resolve(__dirname, 'tests/mocks/hakit-components.tsx'),
          }
        : {}),
    },
  },
  optimizeDeps: {
    include: ['react-grid-layout'],
  },
  server: {
    // Proxy API requests to the Express server (configurable port for E2E tests)
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.VITE_API_PORT || '8099'}`,
        changeOrigin: true,
      },
      '/uploads': {
        target: `http://localhost:${process.env.VITE_API_PORT || '8099'}`,
        changeOrigin: true,
      },
    },
  },
  build: isHACSPanel
    ? {
        lib: {
          entry: path.resolve(__dirname, 'src/ha-panel.tsx'),
          name: 'HaReactDashboard',
          fileName: 'ha-react-dashboard',
          formats: ['iife'],
        },
        rollupOptions: {
          // Bundle everything — HA loads the file as a standalone script
          external: [],
        },
        outDir: 'custom_components/ha_react_dashboard/www',
        emptyOutDir: true,
      }
    : {},
});
