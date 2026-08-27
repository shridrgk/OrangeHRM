import { test, expect } from '@playwright/test';
import { ExampleFeaturePage } from '../pages/ExampleFeaturePage';
import { logger } from '../utils/logger';

/**
 * Template spec for a new OrangeHRM scenario.
 *
 * Copy this file to tests/tcNN-short-kebab-description.spec.ts, import the
 * real Page Object(s) for your feature, and replace the example steps below.
 * Keep all locator/interaction logic inside the Page Object - this file
 * should only orchestrate steps, assert, and log.
 */
test.describe('TCNN - <short scenario description>', () => {
  test('TCNN - <scenario title> @smoke @orangehrm @ui', async ({ page }) => {
    const featurePage = new ExampleFeaturePage(page);

    // Unique per run so repeated executions against the shared live demo
    // instance never collide with data left over from a prior run.
    const name = `SDET Automation Example ${Date.now()}`;

    logger.info('Using authenticated session from global setup');

    logger.info('Navigating to the feature screen');
    await featurePage.goto();

    logger.info('Clicking Add');
    await featurePage.clickAdd();

    logger.info(`Entering name: ${name}`);
    await featurePage.enterName(name);

    const saveResponse = await featurePage.save();
    logger.info(`Save API response status: ${saveResponse.status()}`);
    expect(saveResponse.status()).toBe(200);

    const toastMessage = await featurePage.getToastMessage();
    logger.info(`Save confirmation toast: ${toastMessage}`);
    expect(toastMessage).toContain('Successfully Saved');

    // Auto-retrying wait before checking presence - the grid re-renders
    // asynchronously after the post-save redirect. Never use
    // page.waitForTimeout() here.
    await featurePage.waitForRowVisible(name);
    const isPresent = await featurePage.isRowPresent(name);
    logger.info(`Row present after add: ${isPresent}`);
    expect(isPresent).toBe(true);

    // Clean up any data created by this test - never leave orphaned
    // records on the shared live demo instance.
    // ... call a delete method here, then:
    // await featurePage.waitForRowHidden(name);
    // expect(await featurePage.isRowPresent(name)).toBe(false);
  });
});
