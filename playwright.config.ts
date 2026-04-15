import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for Storybook component testing.
 * Run with: npx playwright test
 * Requires Storybook running at http://localhost:6006 (npm run storybook)
 */
export default defineConfig({
  testDir: './tests/storybook',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:6006',
    trace: 'on-first-retry',
    // Disable Framer Motion animations: components use initial={{ opacity: 0 }}
    // which causes elements to appear hidden until animation completes.
    // reducedMotion: 'reduce' tells Framer Motion to skip all transitions.
    reducedMotion: 'reduce',
    locale: 'fr-FR',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
