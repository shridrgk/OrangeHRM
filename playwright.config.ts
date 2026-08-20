import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { config } from './utils/config';
import { STORAGE_STATE_PATH } from './auth/globalSetup';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
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
