import { expect, test } from '@playwright/test';

function attachRuntimeErrors(page) {
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', request => errors.push(`request: ${request.url()} ${request.failure()?.errorText ?? ''}`));
  return errors;
}

test('desktop workspace exposes the three working surfaces and engine-derived BOM', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/artifacts/dachametr-workspace/index.html');

  await expect(page.getByRole('heading', { name: 'Участок у дома' })).toBeVisible();
  await expect(page.getByTestId('project-structure')).toBeVisible();
  await expect(page.getByTestId('zone-editor')).toBeVisible();
  await expect(page.getByTestId('bom-spec')).toBeVisible();
  await expect(page.getByTestId('plot-area')).toContainText('600 м²');
  await expect(page.getByTestId('bom-spec')).toContainText('2 000 л');
  await expect(page.getByTestId('bom-spec')).toContainText('1 575 кг');
  await expect(page.getByTestId('bom-spec')).toContainText('770 кг');
  await expect(page.getByTestId('bom-total-packages')).toContainText('72 уп.');
  await expect(page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).resolves.toBe(false);
  expect(errors).toEqual([]);
});

test('switching zones keeps selection explicit and opens the selected material inspector', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/artifacts/dachametr-workspace/index.html');

  await page.locator('[data-action="select-zone"][data-zone-id="path"]').click();
  await expect(page.locator('[data-testid="selected-zone-name"]')).toHaveText('Дорожка');
  await expect(page.locator('[data-testid="zone-row-path"]')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('[data-testid="zone-dimensions"]')).toContainText('Длина2 м');
  await expect(page.locator('[data-testid="zone-dimensions"]')).toContainText('Ширина5 м');

  await page.getByRole('button', { name: 'Настроить Песок карьерный' }).click();
  await expect(page.getByTestId('material-inspector')).toBeVisible();
  await expect(page.getByTestId('material-inspector')).toContainText('Песок карьерный');
  await expect(page.getByTestId('material-inspector')).toContainText('Плотность');
  await expect(page.getByTestId('material-inspector')).toContainText('1 500 кг/м³');

  await page.locator('[data-action="select-zone"][data-zone-id="bed"]').click();
  await expect(page.locator('[data-testid="selected-zone-name"]')).toHaveText('Грядка');
  await expect(page.locator('[data-testid="zone-dimensions"]')).toContainText('Длина2 м');
  await expect(page.locator('[data-testid="zone-dimensions"]')).toContainText('Ширина4 м');
  expect(errors).toEqual([]);
});

test('mobile switches between editor and BOM instead of stacking every surface', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/artifacts/dachametr-workspace/index.html');

  await expect(page.getByTestId('mobile-tabs')).toBeVisible();
  await expect(page.getByTestId('zone-editor')).toBeVisible();
  await expect(page.getByTestId('bom-spec')).toBeHidden();
  await page.getByRole('tab', { name: 'Ведомость' }).click();
  await expect(page.getByTestId('bom-spec')).toBeVisible();
  await expect(page.getByTestId('zone-editor')).toBeHidden();
  await expect(page.getByTestId('bom-spec')).toContainText('2 000 л');
  await expect(page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).resolves.toBe(false);
  expect(errors).toEqual([]);
});

test('error state blocks the BOM instead of showing a partial total', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.goto('/artifacts/dachametr-workspace/index.html?state=error');
  await expect(page.getByTestId('blocked-bom')).toBeVisible();
  await expect(page.getByTestId('blocked-bom')).toContainText('Исправьте толщину слоя');
  await expect(page.getByTestId('bom-total-volume')).toHaveText('—');
  expect(errors).toEqual([]);
});
