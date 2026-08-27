// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

/**
 * Project-wide lint rules for the OrangeHRM Playwright automation framework.
 *
 * Goal: catch the specific anti-patterns this framework has hit in practice
 * (arbitrary sleeps instead of auto-retrying waits, weakened/skipped
 * assertions, stray console usage outside utils/logger.ts) so new
 * contributors' test cases stay consistent without relying on manual review.
 */
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['node_modules/**', 'dist/**', 'playwright-report/**', 'test-results/**', 'auth/.auth/**'],
  },
  {
    rules: {
      // No arbitrary sleeps: use Playwright's auto-retrying `expect(...)`/
      // locator waits instead (see pages/JobTitlesPage.ts waitForJobTitleVisible
      // for the established pattern).
      'no-restricted-properties': [
        'error',
        {
          object: 'page',
          property: 'waitForTimeout',
          message:
            'Do not use page.waitForTimeout (arbitrary sleep). Use an auto-retrying expect()/locator wait instead.',
        },
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Route all logging through utils/logger.ts, not raw console calls.
      'no-console': 'error',
    },
  },
  {
    files: ['utils/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  eslintConfigPrettier
);
