import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { LoginPage } from '../pages/LoginPage';

export const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'user.json');

/**
 * Runs once before the whole test run.
 * Logs in as Admin a single time and persists the authenticated
 * storageState so individual tests never need to log in again.
 */
export default async function globalSetup(_config: FullConfig): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: config.baseUrl });
  const page = await context.newPage();

  logger.info('Global setup: logging in once as Admin');
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(config.username, config.password);
  await loginPage.assertLoggedIn();

  await context.storageState({ path: STORAGE_STATE_PATH });
  logger.info(`Global setup: storageState saved to ${STORAGE_STATE_PATH}`);

  await browser.close();
}
