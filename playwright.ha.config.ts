import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout dans un vrai Home Assistant — lancés par
 * `npm run test:ha` (`scripts/ha-e2e.mjs`), qui démarre HA en conteneur.
 */
export default defineConfig({
  testDir: './tests/ha',
  // Un seul HA, une seule configuration de dashboard.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [['html', { outputFolder: 'playwright-report-ha', open: 'never' }], ['list']],
  use: {
    baseURL: process.env.HA_URL ?? 'http://localhost:18123',
    trace: 'on-first-retry',
    reducedMotion: 'reduce',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  },
  projects: [
    // Onboarding, intégration, jeton : un HA neuf n'a rien de tout ça.
    { name: 'setup', testMatch: /ha\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, storageState: 'test-results/ha-auth.json' },
    },
  ],
});
