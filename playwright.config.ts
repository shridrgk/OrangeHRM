import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { config } from './utils/config';
import { STORAGE_STATE_PATH } from './auth/globalSetup';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  // TC02 reconciles the grid against the API across multiple pages against
  // a live shared public demo instance; the default 30s test timeout can be
  // exceeded by normal network latency alone, causing a spurious timeout
  // on the last page's waitForResponse rather than a real bug.
  timeout: 60_000,
  reporter: [['list']],
  globalSetup: path.join(__dirname, 'auth', 'globalSetup.ts'),
  use: {
    baseURL: config.baseUrl,
    storageState: STORAGE_STATE_PATH,
    video: 'off',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
