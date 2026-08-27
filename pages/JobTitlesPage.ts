import { expect, type Page, type Response } from '@playwright/test';

/**
 * The real Job Titles CRUD endpoint used by the OrangeHRM Admin > Job >
 * Job Titles screen, confirmed by inspecting the application's network
 * traffic: POST on Save, DELETE on delete-confirm, both against
 * /api/v2/admin/job-titles.
 */
const JOB_TITLES_API_PATH = '/api/v2/admin/job-titles';

/**
 * Page object for Admin > Job > Job Titles: navigation via the real UI
 * menu (sidebar "Admin" -> topbar "Job" dropdown -> "Job Titles" item),
 * plus add/verify/delete of a job title record.
 */
export class JobTitlesPage {
  constructor(private readonly page: Page) {}

  private readonly adminSidebarLink = this.page.getByRole('link', { name: 'Admin', exact: true });
  private readonly jobTopbarTab = this.page.locator('.oxd-topbar-body-nav-tab-item').filter({ hasText: 'Job' });
  private readonly jobTitlesMenuItem = this.page.getByRole('menuitem', { name: 'Job Titles' });

  private readonly addButton = this.page.getByRole('button', { name: 'Add' });
  private readonly jobTitleInput = this.page.locator('.oxd-input-group', { hasText: 'Job Title' }).locator('input');
  private readonly jobDescriptionTextarea = this.page.getByPlaceholder('Type description here');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly confirmDeleteButton = this.page.getByRole('button', { name: 'Yes, Delete' });
  private readonly toast = this.page.locator('.oxd-toast').first();
  private readonly recordsFoundText = this.page.locator('text=Records Found');

  /**
   * Navigates to the Admin module first (each test starts from a fresh,
   * blank page even with a reused authenticated storageState - there is
   * no prior page to click the sidebar from), then drives the real UI
   * menu: sidebar "Admin" -> topbar "Job" dropdown -> "Job Titles" item.
   */
  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/viewAdminModule');
    await this.jobTopbarTab.waitFor({ state: 'visible' });
    await this.jobTopbarTab.click();
    await this.jobTitlesMenuItem.click();
    await this.page.waitForURL(/viewJobTitleList/);
  }

  async clickAddJob(): Promise<void> {
    await this.addButton.click();
    await this.page.waitForURL(/saveJobTitle/);
  }

  async enterJobDetails(jobTitle: string, jobDescription: string): Promise<void> {
    await this.jobTitleInput.fill(jobTitle);
    await this.jobDescriptionTextarea.fill(jobDescription);
  }

  /** Clicks Save and captures the real create-job-title API response (no guessed/reissued call). */
  async saveJob(): Promise<Response> {
    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes(JOB_TITLES_API_PATH) && res.request().method() === 'POST'
    );
    await this.saveButton.click();
    return responsePromise;
  }

  async getToastMessage(): Promise<string> {
    return (await this.toast.textContent({ timeout: 10_000 })) ?? '';
  }

  private getJobRow(jobTitle: string) {
    return this.page.locator('.oxd-table-card', { hasText: jobTitle });
  }

  async isJobTitlePresent(jobTitle: string): Promise<boolean> {
    return (await this.getJobRow(jobTitle).count()) > 0;
  }

  /**
   * Waits (auto-retrying, no arbitrary sleep) for the newly saved job
   * title's row to actually render in the grid after the post-save
   * redirect - the list re-fetches/re-renders asynchronously, so a
   * one-shot count check can run before that finishes.
   */
  async waitForJobTitleVisible(jobTitle: string): Promise<void> {
    await expect(this.getJobRow(jobTitle)).toBeVisible({ timeout: 15_000 });
  }

  /** Waits (auto-retrying) for the deleted job title's row to be removed from the grid. */
  async waitForJobTitleHidden(jobTitle: string): Promise<void> {
    await expect(this.getJobRow(jobTitle)).toHaveCount(0, { timeout: 15_000 });
  }

  async getRecordsFoundCount(): Promise<number> {
    const text = await this.recordsFoundText.textContent();
    const match = text?.match(/\((\d+)\)/);
    return match ? Number(match[1]) : 0;
  }

  /** Clicks the row's delete (trash) icon, confirms the dialog, and captures the real delete API response. */
  async deleteJobTitle(jobTitle: string): Promise<Response> {
    const row = this.getJobRow(jobTitle);
    const deleteButton = row.locator('.oxd-table-cell-action-space').first();
    await deleteButton.click();

    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes(JOB_TITLES_API_PATH) && res.request().method() === 'DELETE'
    );
    await this.confirmDeleteButton.click();
    return responsePromise;
  }
}
