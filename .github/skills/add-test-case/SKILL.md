---
name: add-test-case
description: 'Add a new Playwright test case (scenario/flow) to the OrangeHRM automation framework without deviating from its Page Object Model, API-capture, and no-arbitrary-wait conventions. Use when: adding a new scenario, new spec file, new Page Object, or a new CRUD/UI flow test for OrangeHRM.'
---

# Add a New Test Case

## When to Use

- A teammate wants to automate a new OrangeHRM scenario (a new screen, a new CRUD flow, a new UI-vs-API reconciliation, etc.).
- You need to add a new Page Object for a screen that doesn't have one yet.

## Procedure

1. **Explore the real application first.** Never guess selectors, URLs, or API endpoints. Use the browser tools (or manual inspection) to confirm:
   - The exact navigation path and URL(s) involved.
   - The exact locators (check actual DOM text — OXD components often have trailing whitespace/icon glyphs after the visible label, so prefer `hasText: 'substring'` over anchored regex `/^Text$/`).
   - The real network request(s) the UI action triggers (method + path), so you can capture and assert on it — never invent/reissue an API call independently.

2. **Create or extend a Page Object in `pages/`.**
   - One class per screen/feature, named `<Feature>Page.ts` (e.g. `JobTitlesPage.ts`).
   - Constructor takes `page: Page`. Locators are `private readonly` fields built from role/text/placeholder selectors (prefer `getByRole`/`getByPlaceholder`/`getByText` over CSS where possible).
   - `goto()` must call `page.goto('/web/index.php/...')` directly as its first step — tests reuse a saved `storageState` and always start on a **blank page**, so never assume a prior page/sidebar link is already present.
   - Any action that triggers a backend call your test needs to verify should return the captured `Response`, e.g.:
     ```typescript
     async saveThing(): Promise<Response> {
       const responsePromise = this.page.waitForResponse(
         (res) => res.url().includes(SOME_API_PATH) && res.request().method() === 'POST'
       );
       await this.saveButton.click();
       return responsePromise;
     }
     ```
   - For any "did the row appear/disappear" check, provide an **auto-retrying** wait method, not a one-shot `.count()` — the grid re-renders asynchronously after a save/delete redirect:
     ```typescript
     async waitForRowVisible(name: string): Promise<void> {
       await expect(this.getRow(name)).toBeVisible({ timeout: 15_000 });
     }
     async waitForRowHidden(name: string): Promise<void> {
       await expect(this.getRow(name)).toHaveCount(0, { timeout: 15_000 });
     }
     ```
   - See [./assets/PageObjectTemplate.ts](./assets/PageObjectTemplate.ts) and the existing `pages/JobTitlesPage.ts` for a complete real example.

3. **If the flow needs API verification**, add a small typed helper in `api/` (see `api/employeeSearchApi.ts`) exporting the API path constant, a `waitForXResponse(page)` function, and a response-shape interface. Don't inline `fetch`/`request.get()` calls in the spec or Page Object as a substitute for the real captured response.

4. **Create the spec file** at `tests/tcNN-short-kebab-description.spec.ts` (next sequential `tcNN` number). Use [./assets/SpecTemplate.spec.ts](./assets/SpecTemplate.spec.ts) as a starting point. Requirements:
   - Only call methods on your Page Object(s) and `expect`/`logger` — no raw `page.*` locator calls in the spec.
   - Tag the test title with relevant `@tags` (e.g. `@smoke @orangehrm @ui @admin @job`).
   - Use unique test data per run (e.g. append `Date.now()`), and if the test creates data, it must delete/clean it up in the same test and verify removal — this runs against the shared live demo instance.
   - Assert on real signals: HTTP status from the captured response, the actual toast text, and the actual UI presence/absence after an explicit wait — never assume success just from the API call without checking the UI too (and vice versa).
   - No `page.waitForTimeout()` anywhere (blocked by ESLint `no-restricted-properties` rule) — use `expect(...).toBeVisible()`/`toHaveURL()`/`toHaveCount()` instead.

5. **Validate before considering it done:**

   ```powershell
   npm run lint
   npm run format:check
   npx playwright test tcNN
   ```

   The test must pass deterministically on a plain run — don't rely on `retries: 1` in `playwright.config.ts` to mask flakiness. If it's flaky, find and fix the real timing/locator cause (see `pages/JobTitlesPage.ts`'s `waitForJobTitleVisible` for a real example of fixing exactly this kind of bug).

6. **Update the README** ([../../../README.md](../../../README.md)) "Existing Test Cases" table with the new spec's row.

## Reference

- Full framework conventions: [../../copilot-instructions.md](../../copilot-instructions.md) and [../../../README.md](../../../README.md)
- Real worked example covering navigation + form-fill + API capture + toast check + auto-retrying presence/absence checks: `pages/JobTitlesPage.ts` + `tests/tc03-job-title-create-delete.spec.ts`
