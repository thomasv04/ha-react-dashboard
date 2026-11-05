import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for **Dashboard E2E tests**.
 *
 * Targets the real Vite dev server (port 5174, mock-HA mode). Each worker starts
 * its own Express server on a temp database (`tests/dashboard/fixtures.ts`).
 *
 * - VITE_MOCK_HA=true replaces @hakit/core & @hakit/components with local mocks
 *   → no real Home Assistant connection, 100 % safe.
 *
 * Run with:   npm run test:e2e:dashboard
 * Debug with: npm run test:e2e:dashboard:ui
 */
export default defineConfig({
  testDir: './tests/dashboard',
  // Chaque worker a son serveur d'API et sa base (`tests/dashboard/fixtures.ts`) :
  // un test qui écrit la configuration ne gêne plus les autres.
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // Un seul serveur de dev pour tous : au-delà, c'est lui qui sature.
  workers: process.env.CI ? 2 : 4,
  // La première navigation attend que Vite compile tout le graphe de modules :
  // ~40 s à froid, bien au-delà des 30 s par défaut. Les tests suivants
  // tournent en moins d'une seconde.
  timeout: 90_000,
  reporter: [['html', { outputFolder: 'playwright-report-dashboard', open: 'never' }], ['list']],
  // Régression visuelle (`visual.spec.ts`) : un pour cent de pixels d'écart
  // couvre l'anticrénelage, pas un élément déplacé ou recoloré.
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 900 },
    locale: 'fr-FR',
  },
  projects: [
    {
      // Amorce la base de test : sans configuration, le dashboard est vide et
      // toute la suite expire en attendant un `[data-widget-id]`.
      name: 'setup',
      testMatch: /seed\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      // Vite dev server with @hakit mocks. Its proxy sends `/api` to the
      // worker's own server, named by the `x-test-api-port` header; 8098 is
      // only the fallback, and nothing listens there.
      command: 'npx vite --port 5174',
      port: 5174,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_MOCK_HA: 'true',
        VITE_API_PORT: '8098',
      },
    },
  ],
});
