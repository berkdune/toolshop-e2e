import { defineConfig, devices } from '@playwright/test';
import { config as appConfig } from './src/config';

export default defineConfig({
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // The demo database resets every hour on the hour; tests that straddle a reset
  // lose their server-side state — a retry rebuilds it with fresh data.
  retries: process.env.CI ? 2 : 1,
  workers: 4, // shared public demo — keep parallelism moderate
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: appConfig.baseURL,
    testIdAttribute: 'data-test',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testDir: './tests/ui',
      // Pin a real browser UA: the demo's WAF blocks the browser's own API calls
      // for datacenter IPs combined with the default HeadlessChrome UA (seen on CI).
      // SLOW_MO: per-action delay in ms for demo/watch runs, e.g.:
      //   SLOW_MO=150 npx playwright test --headed --workers=1
      use: {
        ...devices['Desktop Chrome'],
        userAgent: appConfig.browserUA,
        locale: 'en-US',
        launchOptions: { slowMo: Number(process.env.SLOW_MO ?? 0) },
        // VIDEO=on: record test videos (e.g. for demo clips)
        video: process.env.VIDEO === 'on' ? 'on' : 'off',
      },
    },
    { name: 'api', testDir: './tests/api' },
  ],
});
