import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  ...(process.env.FINORA_COMPOSE_URL
    ? { testMatch: '**/auth.compose.spec.ts' }
    : { testIgnore: '**/auth.compose.spec.ts' }),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.FINORA_COMPOSE_URL ? 0 : process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: process.env.FINORA_COMPOSE_URL ?? 'http://127.0.0.1:4173',
    locale: 'ru-RU',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.FINORA_COMPOSE_URL
    ? undefined
    : {
        command: 'pnpm exec vite --host 127.0.0.1 --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false,
      },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
