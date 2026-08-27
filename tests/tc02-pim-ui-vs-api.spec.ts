import { test, expect } from '@playwright/test';
import { PIMPage, type EmployeeUiRow } from '../pages/PIMPage';
import { type EmployeeApiRecord } from '../api/employeeSearchApi';
import { logger } from '../utils/logger';

function normalize(value: string | undefined | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function apiFullFirstName(record: EmployeeApiRecord): string {
  return normalize(`${record.firstName} ${record.middleName ?? ''}`);
}

interface FieldComparison {
  field: string;
  uiValue: string;
  apiValue: string;
  match: boolean;
}

interface EmployeeComparison {
  identifier: string;
  fields: FieldComparison[];
  isMatch: boolean;
}

function compareEmployee(uiRow: EmployeeUiRow, apiRecord: EmployeeApiRecord): EmployeeComparison {
  const fields: FieldComparison[] = [
    {
      field: 'Employee ID',
      uiValue: normalize(uiRow.employeeId),
      apiValue: normalize(apiRecord.employeeId),
      match: normalize(uiRow.employeeId) === normalize(apiRecord.employeeId),
    },
    {
      field: 'First Name',
      uiValue: normalize(uiRow.firstName),
      apiValue: apiFullFirstName(apiRecord),
      match: normalize(uiRow.firstName) === apiFullFirstName(apiRecord),
    },
    {
      field: 'Last Name',
      uiValue: normalize(uiRow.lastName),
      apiValue: normalize(apiRecord.lastName),
      match: normalize(uiRow.lastName) === normalize(apiRecord.lastName),
    },
  ];

  // Job Title is only rendered in the UI grid when the employee record
  // actually has one; only compare it when the UI displayed it, so we
  // never invent a mismatch for data the UI legitimately hides.
  if (uiRow.jobTitle) {
    fields.push({
      field: 'Job Title',
      uiValue: normalize(uiRow.jobTitle),
      apiValue: normalize(apiRecord.jobTitle?.title),
      match: normalize(uiRow.jobTitle) === normalize(apiRecord.jobTitle?.title),
    });
  }

  return {
    identifier: normalize(uiRow.employeeId) || `${uiRow.firstName} ${uiRow.lastName}`,
    fields,
    isMatch: fields.every((f) => f.match),
  };
}

/**
 * Flattens one employee comparison into a single table row: each field
 * becomes a column, showing the matching value or a "✗ UI vs API" callout
 * on mismatch, plus a final Result column - far more compact/readable than
 * one log line per field.
 */
function buildComparisonRow(comparison: EmployeeComparison): Record<string, string> {
  const row: Record<string, string> = { Employee: comparison.identifier };

  for (const field of comparison.fields) {
    row[field.field] = field.match ? field.uiValue : `✗ UI:"${field.uiValue}" API:"${field.apiValue}"`;
  }
  if (!('Job Title' in row)) {
    row['Job Title'] = '—';
  }
  row['Result'] = comparison.isMatch ? '✔ MATCH' : '✘ MISMATCH';

  return row;
}

test.describe('TC02 - PIM employee grid vs employee-search API reconciliation', () => {
  test('TC02 - PIM UI vs API reconciliation @smoke @orangehrm @api', async ({ page }) => {
    const pimPage = new PIMPage(page);

    logger.info('Navigating to PIM');
    logger.info('Reading employee data from UI');
    logger.info('Calling employee-search API');
    const { response, body } = await pimPage.gotoEmployeeListAndCaptureApiResponse();

    logger.info(`API response status: ${response.status()}`);
    expect(response.status()).toBe(200);

    const metaTotal = body.meta.total;
    logger.info(`API meta total (all pages): ${metaTotal}`);

    const pageCount = await pimPage.getPageCount();
    logger.info(`Total pages to reconcile: ${pageCount}`);

    const allComparisons: EmployeeComparison[] = [];
    let totalUiRows = 0;
    let totalApiRecords = 0;

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      // Page 1's response was already captured by the initial navigation
      // above; subsequent pages are reached by clicking the pagination
      // control, which triggers the same endpoint with an incremented
      // offset - captured the same way (waitForResponse), never re-issued
      // independently.
      const pageResult =
        pageNumber === 1 ? { response, body } : await pimPage.goToPageAndCaptureApiResponse(pageNumber);

      logger.info(`Page ${pageNumber} API response status: ${pageResult.response.status()}`);
      expect(pageResult.response.status()).toBe(200);

      const apiRecords = pageResult.body.data;
      logger.info(`Page ${pageNumber} API employee count: ${apiRecords.length}`);

      // Wait for the grid to finish rendering exactly as many rows as the
      // API returned for this page before reading it (condition-based
      // synchronization, no arbitrary waits).
      await pimPage.waitForGridRowCount(apiRecords.length);
      const uiRows = await pimPage.readEmployeeGridData();
      logger.info(`Page ${pageNumber} UI employee count: ${uiRows.length}`);

      // Each page's grid is populated directly from that page's own
      // response, in the same order (sortField=employee.firstName,
      // sortOrder=ASC), so row i in the UI corresponds to data[i] in the
      // API response for that same page.
      expect(uiRows.length).toBe(apiRecords.length);
      const pageComparisons = uiRows.map((uiRow, index) => compareEmployee(uiRow, apiRecords[index]));
      allComparisons.push(...pageComparisons);
      totalUiRows += uiRows.length;
      totalApiRecords += apiRecords.length;
    }

    logger.info('[UI VS API COMPARISON TABLE]');
    logger.table(allComparisons.map(buildComparisonRow));

    // Reconciliation across all pages must account for every employee
    // reported by the API (meta.total), not just the first page.
    logger.info(`Total UI employees across all pages: ${totalUiRows}`);
    logger.info(`Total API employees across all pages: ${totalApiRecords}`);
    expect(totalUiRows).toBe(metaTotal);
    expect(totalApiRecords).toBe(metaTotal);

    const mismatches = allComparisons.filter((c) => !c.isMatch);
    if (mismatches.length > 0) {
      logger.error(`Employee data mismatch detected for ${mismatches.length} employee(s):`);
      for (const mismatch of mismatches) {
        for (const field of mismatch.fields.filter((f) => !f.match)) {
          logger.error(
            `  [${mismatch.identifier}] ${field.field} -> UI: "${field.uiValue}" | API: "${field.apiValue}"`
          );
        }
      }
    }

    expect(mismatches, `Expected 0 UI/API mismatches, found: ${JSON.stringify(mismatches, null, 2)}`).toHaveLength(0);
  });
});
