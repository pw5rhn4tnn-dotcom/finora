import { defineConfig } from '@playwright/test';
import { join } from 'node:path';

const outputRoot =
  process.env.FINORA_PLAYWRIGHT_OUTPUT_DIR ??
  join(import.meta.dirname, 'test-results');

export default defineConfig({
  testDir: './e2e',
  ...(process.env.FINORA_COMPOSE_URL
    ? { testMatch: '**/*.compose.spec.ts' }
    : { testIgnore: '**/*.compose.spec.ts' }),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
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
  projects: [
    {
      name: 'chromium',
      ...(process.env.FINORA_COMPOSE_URL
        ? { dependencies: ['compose-auth'] }
        : {}),
      testIgnore: process.env.FINORA_COMPOSE_URL
        ? [
            '**/budgets.compose.spec.ts',
            '**/dashboard.compose.spec.ts',
            '**/*.setup.ts',
          ]
        : ['**/*.compose.spec.ts', '**/*.setup.ts'],
      outputDir: join(outputRoot, 'chromium'),
      use: { browserName: 'chromium' },
    },
    ...(process.env.FINORA_COMPOSE_URL
      ? [
          {
            name: 'compose-auth',
            testMatch: '**/compose.setup.ts',
            outputDir: join(outputRoot, 'compose-auth'),
            use: {
              browserName: 'chromium' as const,
              trace: 'off' as const,
              screenshot: 'off' as const,
            },
          },
          {
            name: 'budgets-auth',
            testMatch: '**/budgets.setup.ts',
            outputDir: join(outputRoot, 'budgets-auth'),
            use: {
              browserName: 'chromium' as const,
              trace: 'off' as const,
              screenshot: 'off' as const,
            },
          },
          {
            name: 'dashboard',
            testMatch: '**/dashboard.compose.spec.ts',
            dependencies: ['budgets-auth'],
            outputDir: join(outputRoot, 'dashboard'),
            use: { browserName: 'chromium' as const },
          },
          {
            name: 'budgets',
            testMatch: '**/budgets.compose.spec.ts',
            dependencies: ['budgets-auth'],
            outputDir: join(outputRoot, 'budgets'),
            use: { browserName: 'chromium' as const },
          },
        ]
      : []),
  ],
});
