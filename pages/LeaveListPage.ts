import { type Page } from '@playwright/test';

/**
 * Page object for the Leave > Leave List screen, whose
 * "Show Leave with Status" field is a searchable/multi-select
 * dropdown (OrangeHRM's oxd-multiselect component). Selecting an
 * option adds a removable chip and closes the option list; the
 * option list must be reopened to add another value.
 */
export class LeaveListPage {
  constructor(private readonly page: Page) {}

  private readonly filterToggleButton = this.page.locator('.oxd-table-filter-header-options button.oxd-icon-button');

  private readonly statusFieldGroup = this.page
    .locator('.oxd-input-group')
    .filter({ has: this.page.locator('label', { hasText: 'Show Leave with Status' }) });

  private readonly statusTrigger = this.statusFieldGroup.locator('.oxd-select-text');
  private readonly statusListbox = this.statusFieldGroup.locator('[role="listbox"]');
  private readonly statusOptions = this.statusListbox.locator('[role="option"]');
  private readonly selectedStatusOptions = this.statusListbox.locator('[role="option"].--selected');
  private readonly statusChips = this.statusFieldGroup.locator('.oxd-multiselect-chips-area .oxd-chip');

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/leave/viewLeaveList');
    await this.filterToggleButton.waitFor({ state: 'visible' });

    const isFilterAlreadyOpen = await this.statusFieldGroup.isVisible();
    if (!isFilterAlreadyOpen) {
      await this.filterToggleButton.click();
    }
    await this.statusFieldGroup.waitFor({ state: 'visible' });
  }

  async openStatusDropdown(): Promise<void> {
    if (!(await this.statusListbox.isVisible())) {
      await this.statusTrigger.click();
      await this.statusListbox.waitFor({ state: 'visible' });
    }
  }

  async isDropdownOpen(): Promise<boolean> {
    return this.statusListbox.isVisible();
  }

  /** The dropdown has no free-text search box; only a fixed option list. */
  async hasSearchInput(): Promise<boolean> {
    return (await this.statusFieldGroup.locator('input[type="text"]').count()) > 0;
  }

  async getAllOptionNames(): Promise<string[]> {
    await this.openStatusDropdown();
    return this.statusOptions.allTextContents();
  }

  async getSelectedOptionNames(): Promise<string[]> {
    await this.openStatusDropdown();
    return this.selectedStatusOptions.allTextContents();
  }

  /** Selects the given option. Reopens the dropdown if it auto-closed after a previous selection. */
  async selectStatus(optionName: string): Promise<void> {
    await this.openStatusDropdown();
    await this.statusOptions.filter({ hasText: optionName }).click();
  }

  async getSelectedChipTexts(): Promise<string[]> {
    const rawChips = await this.statusChips.allTextContents();
    // Chip markup is "<name> <clear-icon>"; strip the icon glyph/whitespace.
    return rawChips.map((chip) => chip.replace(/[×✕]/g, '').trim());
  }

  /** True once every option in the list is in the --selected (non-clickable) state. */
  async areAllOptionsSelected(): Promise<boolean> {
    await this.openStatusDropdown();
    const total = await this.statusOptions.count();
    const selected = await this.selectedStatusOptions.count();
    return total > 0 && total === selected;
  }

  async getTotalOptionsCount(): Promise<number> {
    await this.openStatusDropdown();
    return this.statusOptions.count();
  }
}
