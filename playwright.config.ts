import { defineConfig, devices } from '@playwright/test';
import { config as appConfig } from './src/config';

export default defineConfig({
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // Demo DB'si saat başında resetleniyor (gözlem: 08:00/10:00/11:00) — reset anını kesen
  // testler sunucu-tarafı verisini kaybeder; retry testi taze veriyle yeniden kurar.
  retries: process.env.CI ? 2 : 1,
  workers: 4, // paylaşılan public demo — rate limit'e karşı ölçülü paralellik
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
      // Sabit gerçek UA: demo'nun WAF'ı datacenter IP + "HeadlessChrome" UA
      // kombinasyonunda tarayıcının API çağrılarını engelliyor (CI'da görüldü).
      use: { ...devices['Desktop Chrome'], userAgent: appConfig.browserUA, locale: 'en-US' },
    },
    { name: 'api', testDir: './tests/api' },
  ],
});
