import { test, expect } from '@playwright/test';

test('plot-first fieldbook presents a dedicated input band before the workspace', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.site-overview [data-action="plot-field"][data-field="length"]')).toBeVisible();
  await expect(page.locator('.site-overview [data-action="plot-field"][data-field="width"]')).toBeVisible();
  await expect(page.getByTestId('structure-panel')).toBeVisible();
  await expect(page.getByTestId('zone-editor')).toBeVisible();
  const ordering = await page.evaluate(() => {
    const plot = document.querySelector('.site-overview');
    const work = document.querySelector('.workspace-grid');
    return plot && work ? Boolean(plot.compareDocumentPosition(work) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
  });
  expect(ordering).toBe(true);
  await expect(page.getByTestId('dm-design-preview')).toHaveCount(0);
});

test('redesigned responsive shell does not overflow across working widths', async ({ page }) => {
  for (const width of [195, 320, 390, 768, 820, 821, 834, 900, 990, 1024, 1100, 1200, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const metrics = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(metrics.scroll, `horizontal overflow at ${width}`).toBeLessThanOrEqual(metrics.client + 1);
  }
});

test('mobile zone editing remains accessible and invalid input blocks the BOM', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const length = page.locator('.site-overview [data-action="plot-field"][data-field="length"]');
  await length.fill('1,');
  await expect(length).toHaveValue('1,');
  await page.locator('[data-action="mobile-tab"][data-target="bom"]').click();
  await expect(page.getByTestId('blocked-results')).toBeVisible();
  await page.locator('[data-action="mobile-tab"][data-target="zones"]').click();
  await length.fill('20');
  await page.locator('[data-action="plot-field"][data-field="width"]').fill('30');
  await page.getByTestId('add-zone').click();
  await expect(page.getByTestId('zone-editor')).toBeVisible();
  await expect(page.getByTestId('selected-zone-name')).toBeVisible();
});
