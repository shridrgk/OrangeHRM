# OrangeHRM Playwright Framework — Project Guidelines

See [README.md](../README.md) for full setup/run instructions. This file is the condensed, always-applied version for coding agents working in this repo.

## Architecture

- Page Object Model: all locators/interactions live in `pages/*.ts`. `tests/*.spec.ts` files only orchestrate steps, assert, and log — never call `page.*` directly in a spec.
- `auth/globalSetup.ts` logs in once and saves `storageState`; every test starts already authenticated but **on a blank page** — Page Object `goto()` methods must always `page.goto()` to a known URL first, never assume a prior page/link exists.
- Real network responses are captured via `page.waitForResponse()` set up before the triggering action (see `api/employeeSearchApi.ts`, `pages/JobTitlesPage.ts`), never re-issued independently via `fetch`/`request.get()`.

## Build and Test

```powershell
npm install && npx playwright install chromium
npm test                          # full suite
npx playwright test tc03          # single spec
npx playwright test --grep "@tag" # by tag (quote the @ in PowerShell)
npm run lint && npm run format:check
```

## Conventions (deviating from these is a bug, not a style choice)

- **Never use `page.waitForTimeout()`** (arbitrary sleep) — enforced by ESLint. Use auto-retrying `expect(locator).toBeVisible()` / `toHaveCount()` / `toHaveURL()` instead.
- **Prefer substring `hasText: 'X'` over anchored regex** (`/^X$/`) when filtering OXD components — visible labels often have trailing whitespace/icon glyphs in the DOM, causing anchored regex to silently never match and hang.
- **No weakened/skipped assertions** to work around flakiness — fix the real timing/locator cause (e.g. add an explicit visibility wait after a save+redirect before checking grid presence).
- **All logging via `logger` from `utils/logger.ts`** (`info`/`error`/`table`), not raw `console.*`.
- **Test data must be unique per run and self-cleaned** (create → verify → delete → verify gone) since tests run against the shared live OrangeHRM demo instance.
- **Tag every test title** with relevant `@tags` (e.g. `@smoke @orangehrm @ui @admin @job`).
- Run `npm run lint` and `npm run format:check` before considering a change complete.

## Adding New Test Cases

Use the `add-test-case` skill (`.github/skills/add-test-case/SKILL.md`) for the full procedure and file templates.
