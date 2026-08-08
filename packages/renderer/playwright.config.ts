import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './visual-tests',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.001,
    },
  },
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:6006',
    colorScheme: 'light',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run storybook -- --ci --no-open',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: 'http://127.0.0.1:6006',
  },
});
