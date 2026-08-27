import { expect, type Page, type Response } from '@playwright/test';

/**
 * Template Page Object for a new OrangeHRM screen/feature.
 *
 * Copy this file to pages/<Feature>Page.ts, rename the class, and replace
 * the example locators/methods with the real ones for your screen -
 * confirmed against the live application, never guessed.
 */
const EXAMPLE_API_PATH = '/api/v2/example/resource';

export class ExampleFeaturePage {
  constructor(private readonly page: Page) {}

  // Prefer getByRole/getByPlaceholder/getByText over raw CSS where possible.
  private readonly addButton = this.page.getByRole('button', { name: 'Add' });
  private readonly nameInput = this.page.getByPlaceholder('Type name here');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly toast = this.page.locator('.oxd-toast').first();

  private getRow(name: string) {
    return this.page.locator('.oxd-table-card', { hasText: name });
  }

  /**
   * Every test starts on a blank page (storageState is reused, not a live
   * session) - always navigate directly to a known URL first.
   */
  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/example/list');
  }

  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  async enterName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  /** Clicks Save and captures the real create API response - never reissue it independently. */
  async save(): Promise<Response> {
    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes(EXAMPLE_API_PATH) && res.request().method() === 'POST'
    );
    await this.saveButton.click();
    return responsePromise;
  }

  async getToastMessage(): Promise<string> {
    return (await this.toast.textContent({ timeout: 10_000 })) ?? '';
  }

  /** Auto-retrying wait - the grid re-renders asynchronously after a save/delete redirect. */
  async waitForRowVisible(name: string): Promise<void> {
    await expect(this.getRow(name)).toBeVisible({ timeout: 15_000 });
  }

  async waitForRowHidden(name: string): Promise<void> {
    await expect(this.getRow(name)).toHaveCount(0, { timeout: 15_000 });
  }

  async isRowPresent(name: string): Promise<boolean> {
    return (await this.getRow(name).count()) > 0;
  }
}
