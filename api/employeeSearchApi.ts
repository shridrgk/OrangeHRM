import { type Page, type Response } from '@playwright/test';

/**
 * The real employee-search endpoint used by the OrangeHRM PIM Employee
 * List grid, confirmed by inspecting the application's network traffic:
 *   GET /web/index.php/api/v2/pim/employees
 *     ?limit=50&offset=0&model=detailed&includeEmployees=onlyCurrent
 *     &sortField=employee.firstName&sortOrder=ASC
 *
 * Authentication is via the existing session cookie set at login - no
 * separate token is required, so the response is captured directly from
 * the page's own network traffic rather than re-issued independently.
 */
export const EMPLOYEE_SEARCH_API_PATH = '/api/v2/pim/employees';

export interface EmployeeApiRecord {
  empNumber: number;
  employeeId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  jobTitle: { id: number | null; title: string | null };
  empStatus: { id: number | null; name: string | null };
}

export interface EmployeeSearchApiResponse {
  data: EmployeeApiRecord[];
  meta: { total: number };
}

/**
 * Starts listening for the employee-search API response. Must be called
 * BEFORE the navigation/action that triggers the request (the grid loads
 * this request automatically on page load).
 */
export function waitForEmployeeSearchResponse(page: Page): Promise<Response> {
  return page.waitForResponse(
    (res) => res.url().includes(EMPLOYEE_SEARCH_API_PATH) && res.request().method() === 'GET'
  );
}

export async function parseEmployeeSearchResponse(response: Response): Promise<EmployeeSearchApiResponse> {
  return response.json() as Promise<EmployeeSearchApiResponse>;
}
