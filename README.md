# OrangeHRM Playwright Automation Framework

End-to-end UI + API test automation for the [OrangeHRM demo application](https://opensource-demo.orangehrmlive.com), built with [Playwright](https://playwright.dev/) + TypeScript using the Page Object Model (POM).

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Code Quality Checks](#code-quality-checks)
- [Framework Conventions](#framework-conventions)
- [Existing Test Cases](#existing-test-cases)
- [Adding a New Test Case](#adding-a-new-test-case)
- [Troubleshooting](#troubleshooting)

## Tech Stack

- [Playwright Test](https://playwright.dev/docs/intro) (`@playwright/test`) — chromium only, single worker, sequential (`fullyParallel: false`)
- TypeScript
- ESLint (flat config) + Prettier for automated code checks
- `dotenv` for environment/config

## Project Structure

```
auth/               globalSetup.ts - logs in once, saves storageState reused by every test
pages/               Page Object Model classes (one per screen/feature)
api/                 Typed helpers for capturing/parsing real network API responses
tests/               *.spec.ts test files (one scenario/flow per file)
utils/               config.ts (env loading) and logger.ts (shared logging)
playwright.config.ts Global Playwright configuration
.env / .env.example  Environment variables (BASE_URL, USERNAME, PASSWORD)
```

## Getting Started

1. Install dependencies:
   ```powershell
   npm install
   npx playwright install chromium
   ```
2. Copy `.env.example` to `.env` and fill in real values:

   ```powershell
   Copy-Item .env.example .env
   ```

   Required variables: `BASE_URL`, `USERNAME`, `PASSWORD`.

   > **Windows gotcha:** don't name variables things like `USERNAME` if you rely on OS env var precedence elsewhere — this project's `utils/config.ts` calls `dotenv.config({ override: true })` specifically so the `.env` value always wins over Windows' predefined `USERNAME` OS variable.

## Running Tests

```powershell
npm test                        # run the whole suite (headless, chromium)
npm run test:headed             # run headed (visible browser)
npx playwright test tc02        # run a single spec file by name fragment
npx playwright test --grep "@job"   # run by tag
npm run report                  # open the last HTML report
```

Authentication happens **once** per run via `globalSetup` (see [auth/globalSetup.ts](auth/globalSetup.ts)); individual tests reuse the saved `storageState` and start already logged in.

## Code Quality Checks

```powershell
npm run lint            # ESLint check
npm run lint:fix         # ESLint auto-fix
npm run format           # Prettier auto-format
npm run format:check     # Prettier check only (CI-friendly)
```

Run `lint` and `format:check` before opening a PR. The lint config specifically blocks patterns that have caused real bugs in this project before (see [Framework Conventions](#framework-conventions)).

## Framework Conventions

These are enforced by lint rules and/or code review — new test cases **must** follow them:

1. **Page Object Model only.** No raw locators/`page.*` calls in `*.spec.ts` files — all element interaction lives in a `pages/*.ts` class. Test files only orchestrate steps, assert, and log.
2. **No arbitrary sleeps.** Never use `page.waitForTimeout()`. Use Playwright's auto-retrying `expect(locator).toBeVisible()` / `toHaveCount()` / `toHaveURL()` etc. This is enforced by an ESLint rule (`no-restricted-properties` on `page.waitForTimeout`).
3. **Every test starts on a blank page.** Because `storageState` is reused, a test never starts already navigated anywhere. Every Page Object's `goto()` must call `page.goto(...)` directly to a known URL — never assume a link from a previous page already exists on screen.
4. **Prefer substring `hasText` filters over anchored regex.** OXD components frequently render trailing whitespace/icon glyphs after the visible label (e.g. `"Job "` with a chevron icon), so `hasText: /^Job$/` silently never matches and hangs. Use `hasText: 'Job'` unless an exact match is truly required — and if so, verify against the live DOM's actual text first.
5. **Capture real network responses, never guess/reissue them.** Use `page.waitForResponse()` set up _before_ the triggering click/action (see [api/employeeSearchApi.ts](api/employeeSearchApi.ts), `JobTitlesPage.saveJob()`), then assert on the real status code and parsed body. Do not call the API independently with `fetch`/`request.get()` as a substitute for verifying the UI.
6. **All logging goes through `utils/logger.ts`** (`logger.info` / `logger.error` / `logger.table`), not raw `console.*` calls (enforced by lint, `utils/logger.ts` itself is exempted).
7. **No weakened or skipped assertions.** Don't use `.catch(() => {})`, soft assertions, or reduce an assertion's strictness to make a flaky test "pass" — fix the underlying timing/locator issue instead (see lesson from TC03's `isJobTitlePresent` timing bug, resolved with an explicit auto-retrying wait rather than loosening the assertion).
8. **Tag every test** with the relevant `@tags` in the test title (e.g. `@smoke @orangehrm @ui @admin @job`) so `--grep` filtering keeps working.
9. **Unique test data.** Any data you create (e.g. a job title) must use a unique value per run (e.g. a timestamp suffix) since tests run against the shared live demo instance, and must be cleaned up by the test itself (create → verify → delete → verify gone) — never leave orphaned records behind.

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for the condensed version AI coding agents load automatically, and [.github/skills/add-test-case/SKILL.md](.github/skills/add-test-case/SKILL.md) for a step-by-step guide + templates for adding a new scenario.

## Existing Test Cases

| Spec                                                                                     | Scenario                                                                                                   |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [tests/tc01-leave-status-dropdown.spec.ts](tests/tc01-leave-status-dropdown.spec.ts)     | Leave List "Show Leave with Status" multiselect dropdown behavior                                          |
| [tests/tc02-pim-ui-vs-api.spec.ts](tests/tc02-pim-ui-vs-api.spec.ts)                     | PIM Employee List: reconciles every page of the UI grid against the underlying API response                |
| [tests/tc03-job-title-create-delete.spec.ts](tests/tc03-job-title-create-delete.spec.ts) | Admin > Job > Job Titles: create a job title, verify it in the UI + API, then delete it and verify removal |

## Adding a New Test Case

Use the bundled skill for a full step-by-step procedure and copy-paste templates: [.github/skills/add-test-case/SKILL.md](.github/skills/add-test-case/SKILL.md).

Quick summary:

1. Add/extend a Page Object in `pages/` (never put locators in the spec file).
2. If the flow calls a network API you need to verify, add a typed helper in `api/`.
3. Add `tests/tcNN-short-description.spec.ts` following the existing naming pattern, with `@tags` in the title.
4. Run `npm run lint`, `npm run format:check`, then `npx playwright test tcNN` until it passes deterministically (no reliance on `retries` masking flakiness).
5. Clean up any data you create as part of the same test.

## Troubleshooting

- **A locator hangs/times out on click:** check the _actual_ rendered text via a live DOM inspection (trailing spaces/icons are common) rather than assuming the visible label is the full text — see convention #4 above.
- **A row/element seems "missing" right after a save/redirect:** the grid re-renders asynchronously; add an explicit auto-retrying wait (`expect(locator).toBeVisible()`) rather than an instant `.count()` check — see convention #2/#7 and `pages/JobTitlesPage.ts` (`waitForJobTitleVisible`/`waitForJobTitleHidden`) for the established pattern.
- **`npm run lint` fails with a TypeScript version error:** `typescript-eslint` must stay compatible with the pinned `typescript` devDependency version in `package.json` — don't bump `typescript` past what `typescript-eslint` currently supports.
