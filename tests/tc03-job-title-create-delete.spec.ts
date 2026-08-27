import { test, expect } from '@playwright/test';
import { JobTitlesPage } from '../pages/JobTitlesPage';
import { logger } from '../utils/logger';

test.describe('TC03 - Admin Job Titles create and delete', () => {
  test('TC03 - Create and delete a job title @smoke @orangehrm @ui @admin @job', async ({ page }) => {
    const jobTitlesPage = new JobTitlesPage(page);

    // Unique per run so repeated executions against the shared live demo
    // instance never collide with a job title left over from a prior run.
    const jobTitleName = `SDET Automation Job ${Date.now()}`;
    const jobDescription = 'Job title created by the TC03 Playwright automated test.';

    // Step 1: Login - authentication is handled once via globalSetup and
    // reused through storageState (see playwright.config.ts), so every
    // test starts already authenticated as Admin; no per-test login step.
    logger.info('Using authenticated session from global setup (Admin)');

    // Step 2: Navigate via the real UI menu - sidebar "Admin" -> topbar
    // "Job" dropdown -> "Job Titles" menu item.
    logger.info('Navigating to Admin > Job > Job Titles');
    await jobTitlesPage.goto();
    await expect(page).toHaveURL(/viewJobTitleList/);

    const recordsBeforeAdd = await jobTitlesPage.getRecordsFoundCount();
    logger.info(`Job titles count before add: ${recordsBeforeAdd}`);

    // Step 3: Click "Add".
    logger.info('Clicking Add job title');
    await jobTitlesPage.clickAddJob();
    await expect(page).toHaveURL(/saveJobTitle/);

    // Step 4: Enter job name and description, then save.
    logger.info(`Entering job title: ${jobTitleName}`);
    await jobTitlesPage.enterJobDetails(jobTitleName, jobDescription);

    const saveResponse = await jobTitlesPage.saveJob();
    logger.info(`Save job title API response status: ${saveResponse.status()}`);
    expect(saveResponse.status()).toBe(200);

    const saveToast = await jobTitlesPage.getToastMessage();
    logger.info(`Save confirmation toast: ${saveToast}`);
    expect(saveToast).toContain('Successfully Saved');

    // Step 5: Verify the job title was created successfully in the grid.
    await page.waitForURL(/viewJobTitleList/);
    await jobTitlesPage.waitForJobTitleVisible(jobTitleName);
    const isPresentAfterAdd = await jobTitlesPage.isJobTitlePresent(jobTitleName);
    logger.info(`Job title present in list after add: ${isPresentAfterAdd}`);
    expect(isPresentAfterAdd).toBe(true);

    const recordsAfterAdd = await jobTitlesPage.getRecordsFoundCount();
    logger.info(`Job titles count after add: ${recordsAfterAdd}`);
    expect(recordsAfterAdd).toBe(recordsBeforeAdd + 1);

    // Step 6: Delete the newly created job title.
    logger.info(`Deleting job title: ${jobTitleName}`);
    const deleteResponse = await jobTitlesPage.deleteJobTitle(jobTitleName);
    logger.info(`Delete job title API response status: ${deleteResponse.status()}`);
    expect(deleteResponse.status()).toBe(200);

    const deleteToast = await jobTitlesPage.getToastMessage();
    logger.info(`Delete confirmation toast: ${deleteToast}`);
    expect(deleteToast).toContain('Successfully Deleted');

    await jobTitlesPage.waitForJobTitleHidden(jobTitleName);
    const isPresentAfterDelete = await jobTitlesPage.isJobTitlePresent(jobTitleName);
    logger.info(`Job title present in list after delete: ${isPresentAfterDelete}`);
    expect(isPresentAfterDelete).toBe(false);

    const recordsAfterDelete = await jobTitlesPage.getRecordsFoundCount();
    logger.info(`Job titles count after delete: ${recordsAfterDelete}`);
    expect(recordsAfterDelete).toBe(recordsBeforeAdd);
  });
});
