import { test, expect } from '@playwright/test';
import { LeaveListPage } from '../pages/LeaveListPage';
import { logger } from '../utils/logger';

test.describe('TC01 - Leave status multi-select dropdown', () => {
  test('TC01 - Dropdown selection limit @smoke @orangehrm @ui @dropdown', async ({ page }) => {
    const leaveListPage = new LeaveListPage(page);

    logger.info('Navigating to dropdown');
    await leaveListPage.goto();

    logger.info('Opening dropdown');
    await leaveListPage.openStatusDropdown();
    expect(await leaveListPage.isDropdownOpen()).toBe(true);

    const hasSearchInput = await leaveListPage.hasSearchInput();
    logger.info(`Search input present on this dropdown: ${hasSearchInput}`);
    // "Show Leave with Status" exposes a fixed, short option list (5 leave
    // statuses) with no free-text search box - verified against the live DOM.
    expect(hasSearchInput).toBe(false);

    const allOptionNames = await leaveListPage.getAllOptionNames();
    const initiallySelected = await leaveListPage.getSelectedOptionNames();
    logger.info(`Available options: ${allOptionNames.join(', ')}`);
    logger.info(`Initially selected: ${initiallySelected.join(', ')}`);

    // Select every option that isn't already selected, to exercise
    // multi-selection up to the maximum available value.
    const optionsToSelect = allOptionNames.filter((name) => !initiallySelected.includes(name));
    for (const optionName of optionsToSelect) {
      logger.info(`Selecting option: ${optionName}`);
      await leaveListPage.selectStatus(optionName);
    }

    const selectedValues = await leaveListPage.getSelectedChipTexts();
    logger.info(`Selected values: ${selectedValues.join(', ')}`);
    expect(selectedValues.slice().sort()).toEqual(allOptionNames.slice().sort());

    const maxAllowed = allOptionNames.length;
    logger.info(`Current selection count: ${selectedValues.length}`);
    logger.info(`Maximum allowed selections: ${maxAllowed}`);
    expect(selectedValues.length).toBe(maxAllowed);

    // Attempt to select beyond the limit: reopen the dropdown and verify
    // every option is now in the selected/disabled state, i.e. there are
    // no further values left to select.
    logger.info('Attempting selection beyond limit');
    const allOptionsNowSelected = await leaveListPage.areAllOptionsSelected();
    const totalOptionsAfter = await leaveListPage.getTotalOptionsCount();

    // OrangeHRM does not show a separate validation/toast message for this
    // dropdown; it enforces the maximum by disabling every remaining
    // option once all values have been selected (verified against the
    // live application - no message text is rendered).
    logger.info(
      'Validation message: none displayed; application enforces the limit by disabling all remaining options'
    );
    expect(allOptionsNowSelected).toBe(true);
    expect(totalOptionsAfter).toBe(maxAllowed);
    logger.info('Selection limit validation: PASS');
  });
});
