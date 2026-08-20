import { expect, type Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/auth/login');
  }

  async login(username: string, password: string): Promise<void> {
    await this.page.getByPlaceholder('Username').fill(username);
    await this.page.getByPlaceholder('Password').fill(password);
    await this.page.getByRole('button', { name: 'Login' }).click();
  }

  async assertLoggedIn(): Promise<void> {
    // The shared public demo instance can be slow to redirect after login;
    // the default 5s expect timeout is occasionally too tight and produces
    // a flaky failure (page.url() still "" when the assertion polls).
    await expect(this.page).toHaveURL(/dashboard\/index/, { timeout: 15000 });
  }
}
