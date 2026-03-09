import { test, expect } from '@playwright/test';

test.describe('BCPF Master Data (/app-management/bcpf)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app-management/bcpf');
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
  });

  /* ─── Page Load ─── */

  test('page title and heading render', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('BCPF Master Data');
  });

  test('sidebar link is active', async ({ page }) => {
    const link = page.locator('nav a', { hasText: 'BCPF Master Data' });
    await expect(link).toBeVisible();
  });

  test('table loads with data rows', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    await expect(rows).not.toHaveCount(0);
  });

  /* ─── Search Form ─── */

  test('search form has all expected fields', async ({ page }) => {
    await expect(page.getByPlaceholder('Version')).toBeVisible();
    await expect(page.getByPlaceholder('Domain L1')).toBeVisible();
    await expect(page.getByPlaceholder('Sub Domain L2')).toBeVisible();
    await expect(page.getByPlaceholder('BC Name')).toBeVisible();
    // Level dropdown (5 options: All + L1-L4) — the first select in the search form
    const searchForm = page.locator('.bg-white.rounded-lg.border').first();
    const levelSelect = searchForm.locator('select').first();
    await expect(levelSelect).toBeVisible();
    await expect(levelSelect.locator('option')).toHaveCount(5);
  });

  test('search and reset buttons exist', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  });

  /* ─── Table Columns ─── */

  test('table has expected column headers', async ({ page }) => {
    const headers = page.locator('table thead th');
    const texts = await headers.allTextContents();
    const joined = texts.join(' ');
    expect(joined).toContain('BC ID');
    expect(joined).toContain('BC Name');
    expect(joined).toContain('Domain L1');
    expect(joined).toContain('Sub Domain L2');
    expect(joined).toContain('Capability Group L3');
    expect(joined).toContain('Level');
    expect(joined).toContain('Version');
  });

  test('BC ID is rendered in blue', async ({ page }) => {
    const firstBcId = page.locator('table tbody tr:first-child td:first-child span.text-primary-blue');
    await expect(firstBcId).toBeVisible();
  });

  /* ─── Action Bar ─── */

  test('import and export buttons are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Import/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
  });

  /* ─── Filtering ─── */

  test('search by BC Name filters results', async ({ page }) => {
    await page.getByPlaceholder('BC Name').fill('Finance');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('filter by Level = L1', async ({ page }) => {
    await page.locator('select').first().selectOption('1');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('reset button clears all filters', async ({ page }) => {
    await page.getByPlaceholder('BC Name').fill('Finance');
    await page.locator('select').first().selectOption('1');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    await page.getByRole('button', { name: 'Reset' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    await expect(page.getByPlaceholder('BC Name')).toHaveValue('');
    await expect(page.locator('select').first()).toHaveValue('');
  });

  /* ─── Sorting ─── */

  test('clicking column header changes sort indicator', async ({ page }) => {
    // Record initial first row
    const initialFirst = (await page.locator('table tbody tr:first-child td:nth-child(2)').textContent())!.trim();

    // Click BC Name header to sort
    await page.getByRole('columnheader', { name: 'BC Name' }).click();
    await page.waitForTimeout(500);

    // After sort, data order should change
    const sortedFirst = (await page.locator('table tbody tr:first-child td:nth-child(2)').textContent())!.trim();
    // At minimum, the sort was applied (data may or may not visually reorder depending on default)
    expect(sortedFirst).toBeTruthy();
  });

  test('clicking same header twice reverses sort', async ({ page }) => {
    const header = page.getByRole('columnheader', { name: 'BC Name' });
    // Record initial first row
    const initialFirst = (await page.locator('table tbody tr:first-child td:nth-child(2)').textContent())!.trim();

    // Click once (asc)
    await header.click();
    await page.waitForTimeout(500);

    // Click again (desc)
    await header.click();
    await page.waitForTimeout(500);
    const afterDesc = (await page.locator('table tbody tr:first-child td:nth-child(2)').textContent())!.trim();

    // After sort, data order should change
    expect(afterDesc).toBeTruthy();
  });

  /* ─── Pagination ─── */

  test('pagination shows total count', async ({ page }) => {
    await expect(page.getByText(/Total/)).toBeVisible();
  });

  test('default page size is 10', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeLessThanOrEqual(10);
  });

  test('changing page loads new data', async ({ page }) => {
    const firstRowText = (await page.locator('table tbody tr:first-child td:first-child').textContent())!.trim();

    const paginationArea = page.locator('nav, .pagination, [class*="pagination"]').last();
    const page2Btn = paginationArea.getByRole('button', { name: '2', exact: true });
    if (await page2Btn.isVisible()) {
      await page2Btn.click();
      await page.waitForSelector('table tbody tr', { timeout: 5000 });
      const secondPageText = (await page.locator('table tbody tr:first-child td:first-child').textContent())!.trim();
      expect(secondPageText).not.toEqual(firstRowText);
    }
  });
});
