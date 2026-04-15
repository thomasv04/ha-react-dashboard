import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for **Dashboard E2E tests**.
 *
 * Targets the real Vite dev server (port 5174, mock-HA mode) + Express server
 * (port 8098, temp test database).
 *
 * - VITE_MOCK_HA=true replaces @hakit/core & @hakit/components with local mocks
 *   → no real Home Assistant connection, 100 % safe.
 * - DB_PATH points to a temp SQLite file so production data is never touched.
 *
 * Run with:   npm run test:e2e:dashboard
 * Debug with: npm run test:e2e:dashboard:ui
 */
export default defineConfig({
  testDir: './tests/dashboard',
  fullyParallel: false, // sequential — tests may depend on dashboard state
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-dashboard', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 900 },
    locale: 'fr-FR',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      // Express API server with isolated test database
      command: 'node server/index.js',
      port: 8098,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: '8098',
        DB_PATH: './data/test-dashboard.db',
        NODE_ENV: 'development',
      },
    },
    {
      // Vite dev server with @hakit mocks, proxying API to test server on :8098
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
