import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { readFileSync } from 'fs';

import dotenv from 'dotenv';
dotenv.config();

// Build mode flags
// VITE_ADDON=true      → SPA via HA ingress (MUST use relative paths './' so asset
//                        URLs resolve under /api/hassio_ingress/<token>/)
// VITE_HACS_PANEL=true → IIFE bundle for Python integration (Level 2, self-contained JS)
// VITE_HACS=true       → SPA with relative paths for HACS frontend category (Level 1)
// (default)            → SPA with absolute paths for SSH deployment
const isAddon = process.env.VITE_ADDON === 'true';
// `vite build --mode panel` : évite d'avoir à poser une variable d'environnement,
// ce qui ne s'écrit pas pareil sous Windows et sous Linux.
const isHACSPanel = process.env.VITE_HACS_PANEL === 'true' || process.argv.includes('panel');
const useRelativePaths = process.env.VITE_HACS === 'true';
const VITE_FOLDER_NAME = process.env.VITE_FOLDER_NAME || 'community/ha-react-dashboard';
// Addon MUST use './' — ingress rewrites the path prefix so absolute '/'
// would point to HA itself instead of the add-on container.
const basePath = isAddon ? './' : useRelativePaths ? './' : `/local/${VITE_FOLDER_NAME}/`;

// Mock-HA mode: replace @hakit/* with local mocks for E2E testing
// `vite --mode mock` en plus de la variable d'environnement, même raison que
// `panel` plus haut : travailler l'interface sans Home Assistant sous la main.
const isMockHA = process.env.VITE_MOCK_HA === 'true' || process.argv.includes('mock');

// Version gravée dans le bundle. Lue depuis `config.yaml` — c'est ce fichier que
// `create-tag` bump, donc le seul qui suive le tag publié. `release-notes.ts`,
// tenu à la main, annonçait 2.1.3 dans un build 2.1.4. Un build qui ne sait pas
// quelle version il est n'a rien à faire dans une release : on échoue ici.
const buildVersion = readFileSync(path.resolve(__dirname, 'ha-react-dashboard/config.yaml'), 'utf-8').match(/^version:\s*'([^']+)'/m)?.[1];
if (!buildVersion) throw new Error('Version introuvable dans ha-react-dashboard/config.yaml — le bundle afficherait un numéro faux.');

// https://vite.dev/config/
export default defineConfig({
  base: isHACSPanel ? './' : basePath,
  plugins: [
    react(),
    tailwindcss(),
    // `vite-plugin-css-injected-by-js` a été retiré du mode carte : il pose le
    // CSS dans `document.head`, or une carte Lovelace vit dans le shadow DOM de
    // `hui-root`, qui ne voit pas les styles du document — le dashboard sortait
    // entièrement sans style. Le CSS est désormais un fichier, que `ha-card.ts`
    // attache aux deux endroits.
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
  server: {
    // Sur Windows, Node résout `localhost` en `::1` d'abord : Vite n'écoutait
    // que sur IPv6 pendant que Chrome appelait 127.0.0.1 → ERR_CONNECTION_REFUSED.
    host: '127.0.0.1',
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
  // En mode `lib`, Vite ne substitue pas `process.env.NODE_ENV` (contrairement au
  // build SPA) : React et framer-motion le lisent au chargement et la carte
  // mourait sur `process is not defined`.
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
    ...(isHACSPanel ? { 'process.env.NODE_ENV': '"production"' } : {}),
  },
  build: isHACSPanel
    ? {
        // ESM, pas IIFE : HA charge ce fichier sur *chaque* page du frontend.
        // Un bundle monolithique, c'était 21 Mo à chaque navigation. En module,
        // Rollup sort une entrée de quelques kilo-octets et ne télécharge le
        // dashboard qu'au montage de la carte (`import()` dans ha-card.ts).
        lib: {
          entry: path.resolve(__dirname, 'src/ha-card.ts'),
          fileName: () => 'ha-react-dashboard.js',
          formats: ['es'],
        },
        // Une seule feuille de style, à nom fixe : `ha-card.ts` la résout par
        // `import.meta.url` et doit pouvoir la nommer sans lire de manifeste.
        cssCodeSplit: false,
        rollupOptions: {
          // Bundle everything — HA loads the file as a standalone script
          external: [],
          output: {
            chunkFileNames: 'chunks/[name]-[hash].js',
            assetFileNames: info => (info.names?.[0]?.endsWith('.css') ? 'assets/dashboard.css' : 'assets/[name]-[hash][extname]'),
          },
        },
        outDir: 'custom_components/ha_react_dashboard/www',
        emptyOutDir: true,
      }
    : {},
});
