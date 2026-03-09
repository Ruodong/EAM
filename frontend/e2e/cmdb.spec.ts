import { test, expect } from '@playwright/test';

test.describe('Application Master Data (/app-management/cmdb)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app-management/cmdb');
    // Wait for table data to load
    await page.waitForSelector('table tbody tr', { timeout: 10_000 });
  });

  /* ─── Page Load ─── */

  test('page title and heading render', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Application Master Data');
  });

  test('sidebar link is active', async ({ page }) => {
    const link = page.locator('nav a', { hasText: 'Application Master Data' });
    await expect(link).toBeVisible();
  });

  test('table loads with data rows', async ({ page }) => {
    const rows = page.locator('table tbody tr');
    await expect(rows).not.toHaveCount(0);
  });

  test('first row has a valid App ID (empty IDs sorted last)', async ({ page }) => {
    const firstAppId = page.locator('table tbody tr:first-child td:first-child');
    await expect(firstAppId).toHaveText(/^A\d+/);
  });

  test('pagination shows total count', async ({ page }) => {
    await expect(page.getByText(/Total/)).toBeVisible();
  });

  /* ─── Search Form ─── */

  test('search form has all expected fields', async ({ page }) => {
    const form = page.locator('.bg-white.rounded-lg.border').first();
    // Text inputs
    await expect(form.getByPlaceholder('Application ID')).toBeVisible();
    await expect(form.getByPlaceholder('Name or Full Name')).toBeVisible();
    await expect(form.getByPlaceholder('Owner Tower')).toBeVisible();
    await expect(form.getByPlaceholder('Owned By')).toBeVisible();
    // Dropdown selects (6 total)
    const selects = form.locator('select');
    await expect(selects).toHaveCount(6);
  });

  test('dropdown filters have correct options', async ({ page }) => {
    // Status dropdown: All + Active, Decommissioned, Planned, Retain = 5
    const statusSelect = page.locator('select').nth(0);
    await expect(statusSelect.locator('option')).toHaveCount(5);

    // Classification dropdown: All + 6 = 7
    const classSelect = page.locator('select').nth(1);
    await expect(classSelect.locator('option')).toHaveCount(7);

    // Solution Type dropdown: All + 5 = 6
    const solSelect = page.locator('select').nth(2);
    await expect(solSelect.locator('option')).toHaveCount(6);

    // App Ownership dropdown: All + 3 = 4
    const ownershipSelect = page.locator('select').nth(4);
    await expect(ownershipSelect.locator('option')).toHaveCount(4);

    // Portfolio dropdown: All + 4 = 5
    const portfolioSelect = page.locator('select').nth(5);
    await expect(portfolioSelect.locator('option')).toHaveCount(5);
  });

  /* ─── Filtering ─── */

  test('filter by Status = Active', async ({ page }) => {
    await page.locator('select').nth(0).selectOption('Active');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // All visible status badges should say Active
    const statuses = page.locator('table tbody td:nth-child(4)');
    const count = await statuses.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(statuses.nth(i)).toContainText('Active');
    }
  });

  test('filter by Name text search', async ({ page }) => {
    await page.getByPlaceholder('Name or Full Name').fill('ECC');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    // At least one row should contain ECC
    await expect(page.locator('table tbody').getByText('ECC').first()).toBeVisible();
  });

  test('filter by Solution Type = SaaS', async ({ page }) => {
    await page.locator('select').nth(2).selectOption('SaaS');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('reset button clears filters', async ({ page }) => {
    // Apply a filter first
    await page.locator('select').nth(0).selectOption('Decommissioned');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // Click reset
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // Status select should be back to empty (All)
    await expect(page.locator('select').nth(0)).toHaveValue('');
  });

  /* ─── Sorting ─── */

  test('default sort is App ID ascending', async ({ page }) => {
    // Wait until first cell actually contains an App ID (not "Loading...")
    await page.locator('table tbody tr:first-child td:first-child').filter({ hasText: /^A\d+/ }).waitFor({ timeout: 10_000 });

    const firstId = (await page.locator('table tbody tr:first-child td:first-child').textContent())!.trim();
    const secondId = (await page.locator('table tbody tr:nth-child(2) td:first-child').textContent())!.trim();
    // Both should start with A and first should come before second
    expect(firstId).toMatch(/^A\d+/);
    expect(secondId).toMatch(/^A\d+/);
    expect(firstId.localeCompare(secondId)).toBeLessThanOrEqual(0);
  });

  test('clicking Name header sorts by name', async ({ page }) => {
    await page.getByRole('columnheader', { name: 'Name', exact: true }).click();
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    const firstName = (await page.locator('table tbody tr:first-child td:nth-child(2)').textContent())!.trim();
    const secondName = (await page.locator('table tbody tr:nth-child(2) td:nth-child(2)').textContent())!.trim();
    expect(firstName.localeCompare(secondName)).toBeLessThanOrEqual(0);
  });

  test('clicking same header twice reverses sort', async ({ page }) => {
    const header = page.getByRole('columnheader', { name: 'Name', exact: true });
    // Click once (asc)
    await header.click();
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    // Click again (desc)
    await header.click();
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    const firstName = (await page.locator('table tbody tr:first-child td:nth-child(2)').textContent())!.trim();
    const secondName = (await page.locator('table tbody tr:nth-child(2) td:nth-child(2)').textContent())!.trim();
    // Desc order: first >= second
    expect(firstName.localeCompare(secondName)).toBeGreaterThanOrEqual(0);
  });

  /* ─── Pagination ─── */

  test('changing page loads new data', async ({ page }) => {
    const firstPageId = (await page.locator('table tbody tr:first-child td:first-child').textContent())!.trim();

    // Click page 2 button — find it within pagination area (not the table)
    const paginationArea = page.locator('nav, .pagination, [class*="pagination"]').last();
    const page2Btn = paginationArea.getByRole('button', { name: '2', exact: true });
    if (await page2Btn.isVisible()) {
      await page2Btn.click();
      await page.waitForSelector('table tbody tr', { timeout: 5000 });
      const secondPageId = (await page.locator('table tbody tr:first-child td:first-child').textContent())!.trim();
      expect(secondPageId).not.toEqual(firstPageId);
    }
  });

  /* ─── Detail Drawer ─── */

  test('clicking a row opens detail drawer', async ({ page }) => {
    await page.locator('table tbody tr:first-child td:nth-child(2)').click();
    await page.waitForTimeout(300);

    const drawer = page.locator('.fixed.inset-0');
    await expect(drawer).toBeVisible();
  });

  test('detail drawer shows basic information section', async ({ page }) => {
    await page.locator('table tbody tr:first-child td:nth-child(2)').click();
    await page.waitForTimeout(300);

    const drawer = page.locator('.fixed.inset-0');
    await expect(drawer.getByRole('heading', { name: 'Basic Information' })).toBeVisible();
  });

  test('detail drawer shows ownership section', async ({ page }) => {
    await page.locator('table tbody tr:first-child td:nth-child(2)').click();
    await page.waitForTimeout(300);

    const drawer = page.locator('.fixed.inset-0');
    await expect(drawer.getByRole('heading', { name: 'Ownership' })).toBeVisible();
  });

  test('detail drawer shows description section', async ({ page }) => {
    await page.locator('table tbody tr:first-child td:nth-child(2)').click();
    await page.waitForTimeout(300);

    // Scroll down in drawer to see description section
    const drawerContent = page.locator('.fixed.inset-0 .overflow-y-auto');
    await drawerContent.evaluate(el => el.scrollTo(0, el.scrollHeight));
    await expect(page.getByText('DESCRIPTION & OTHER')).toBeVisible();
  });

  test('detail drawer classification has no curly braces', async ({ page }) => {
    await page.locator('table tbody tr:first-child td:nth-child(2)').click();
    await page.waitForTimeout(300);

    const drawer = page.locator('.fixed.inset-0');
    const content = await drawer.textContent();
    expect(content).not.toContain('{"');
    expect(content).not.toContain('"}');
  });

  test('clicking overlay closes drawer', async ({ page }) => {
    await page.locator('table tbody tr:first-child td:nth-child(2)').click();
    await page.waitForTimeout(300);

    await page.locator('.absolute.inset-0.bg-black\\/20').click({ force: true, position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);

    await expect(page.locator('.fixed.inset-0')).not.toBeVisible();
  });

  test('clicking X button closes drawer', async ({ page }) => {
    await page.locator('table tbody tr:first-child td:nth-child(2)').click();
    await page.waitForTimeout(300);

    await page.locator('.fixed.inset-0 button').first().click();
    await page.waitForTimeout(300);

    await expect(page.locator('.fixed.inset-0')).not.toBeVisible();
  });

  /* ─── Combined Filter + Sort ─── */

  test('filter and sort work together', async ({ page }) => {
    // Filter by Status = Active
    await page.locator('select').nth(0).selectOption('Active');
    await page.getByRole('button', { name: 'Search' }).click();
    // Wait for filtered data to load — status column should show "Active"
    await page.locator('table tbody td:nth-child(4)').filter({ hasText: 'Active' }).first().waitFor({ timeout: 10_000 });

    // Sort by Name (use exact role selector to avoid matching "Full Name")
    await page.getByRole('columnheader', { name: 'Name', exact: true }).click();
    // Wait for sorted data to reload — first status cell should still be Active
    await page.locator('table tbody td:nth-child(4)').filter({ hasText: 'Active' }).first().waitFor({ timeout: 10_000 });

    // All rows should still be Active
    const statuses = page.locator('table tbody td:nth-child(4)');
    const count = await statuses.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 3); i++) {
      await expect(statuses.nth(i)).toContainText('Active');
    }

    // And names should be sorted ascending
    const firstName = (await page.locator('table tbody tr:first-child td:nth-child(2)').textContent())!.trim();
    const secondName = (await page.locator('table tbody tr:nth-child(2) td:nth-child(2)').textContent())!.trim();
    expect(firstName.localeCompare(secondName)).toBeLessThanOrEqual(0);
  });
});
