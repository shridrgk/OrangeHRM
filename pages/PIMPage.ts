import { expect, type Page, type Response } from '@playwright/test';
import {
  waitForEmployeeSearchResponse,
  parseEmployeeSearchResponse,
  type EmployeeSearchApiResponse,
} from '../api/employeeSearchApi';

export interface EmployeeUiRow {
  employeeId: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  employmentStatus?: string;
}

// Known column labels rendered in the grid's own column-header row. Used to
// dynamically discover each column's positional index (see
// `getColumnIndexMap`) so data cells can be read by position rather than by
// guessed/hardcoded ordering.
const COLUMN_HEADERS = ['Id', 'First (& Middle) Name', 'Last Name', 'Job Title', 'Employment Status'];

export class PIMPage {
  constructor(private readonly page: Page) {}

  // Numbered pagination buttons rendered below the grid (e.g. "1", "2", "3").
  // Excludes the previous/next chevron buttons, which use a different
  // modifier class (--previous-next) - confirmed via live DOM inspection.
  private readonly pageNumberButtons = this.page.locator('.oxd-pagination-page-item--page');

  /**
   * Navigates to the PIM Employee List and captures the exact
   * employee-search API response that the application uses to
   * populate the grid (GET .../api/v2/pim/employees).
   */
  async gotoEmployeeListAndCaptureApiResponse(): Promise<{
    response: Response;
    body: EmployeeSearchApiResponse;
  }> {
    const responsePromise = waitForEmployeeSearchResponse(this.page);
    await this.page.goto('/web/index.php/pim/viewEmployeeList');
    const response = await responsePromise;
    const body = await parseEmployeeSearchResponse(response);
    return { response, body };
  }

  /**
   * Total number of pages currently rendered in the pagination control.
   * Read directly from the live DOM (not computed/guessed from meta.total)
   * so it always matches what a user could actually click through.
   */
  async getPageCount(): Promise<number> {
    return this.pageNumberButtons.count();
  }

  /**
   * Clicks the given 1-based page number and captures the API response
   * that this pagination click triggers (same endpoint, incremented
   * offset), mirroring gotoEmployeeListAndCaptureApiResponse for
   * subsequent pages rather than a full page reload.
   */
  async goToPageAndCaptureApiResponse(pageNumber: number): Promise<{
    response: Response;
    body: EmployeeSearchApiResponse;
  }> {
    const responsePromise = waitForEmployeeSearchResponse(this.page);
    await this.pageNumberButtons.nth(pageNumber - 1).click();
    const response = await responsePromise;
    const body = await parseEmployeeSearchResponse(response);
    return { response, body };
  }

  /**
   * Locates only the data rows of the employee grid. Note: `getByRole('row')`
   * also matches the sortable column-header row (it exposes
   * role="row" with "Ascending"/"Descending" sort controls) on a full page
   * load, so the grid's own `.oxd-table-card` row class is used instead to
   * reliably scope to employee data rows only (verified against the live DOM).
   */
  private getEmployeeRows() {
    return this.page.locator('.oxd-table-card');
  }

  async getEmployeeRowCount(): Promise<number> {
    return this.getEmployeeRows().count();
  }

  /**
   * Waits for the grid to finish rendering exactly `expectedCount` rows.
   * Uses an auto-retrying locator assertion instead of an arbitrary sleep,
   * since the grid renders asynchronously after the API response resolves.
   */
  async waitForGridRowCount(expectedCount: number): Promise<void> {
    await expect(this.getEmployeeRows()).toHaveCount(expectedCount);
  }

  /**
   * Reads the grid's own column-header row (role="columnheader") and maps
   * each known column label to its positional index among the data row's
   * cells. Data cells render as plain values (no repeated header text), so
   * they must be read positionally; deriving the position from the grid's
   * own live header avoids hardcoding/guessing the column order.
   */
  private async getColumnIndexMap(): Promise<Record<string, number>> {
    const headerTexts = await this.page.getByRole('columnheader').allTextContents();
    const indexMap: Record<string, number> = {};

    for (const header of COLUMN_HEADERS) {
      const index = headerTexts.findIndex((text) => text.startsWith(header));
      if (index !== -1) {
        indexMap[header] = index;
      }
    }

    return indexMap;
  }

  /**
   * Reads and normalizes the employees currently rendered in the
   * PIM employee-list grid (i.e. the current page only).
   */
  async readEmployeeGridData(): Promise<EmployeeUiRow[]> {
    const columnIndexMap = await this.getColumnIndexMap();
    const rows = this.getEmployeeRows();
    const rowCount = await rows.count();
    const result: EmployeeUiRow[] = [];

    for (let i = 0; i < rowCount; i++) {
      const cellTexts = await rows.nth(i).getByRole('cell').allTextContents();
      const fields: Record<string, string> = {};

      for (const header of COLUMN_HEADERS) {
        const columnIndex = columnIndexMap[header];
        if (columnIndex !== undefined && columnIndex < cellTexts.length) {
          fields[header] = cellTexts[columnIndex].trim();
        }
      }

      result.push({
        employeeId: fields['Id'] ?? '',
        firstName: fields['First (& Middle) Name'] ?? '',
        lastName: fields['Last Name'] ?? '',
        jobTitle: fields['Job Title'] || undefined,
        employmentStatus: fields['Employment Status'] || undefined,
      });
    }

    return result;
  }
}
