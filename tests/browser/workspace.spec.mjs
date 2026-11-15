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
  await expect(page.locator('.figure-scale').first()).toHaveText('Условная схема размеров');
  await expect(page.getByText('1 м : 24 px')).toHaveCount(0);
  await expect(page.getByText('прототип').first()).toBeVisible();
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

async function assertMobileZoneNavigation(page, width, height) {
  const errors = attachRuntimeErrors(page);
  await page.setViewportSize({ width, height });
  await page.goto('/artifacts/dachametr-workspace/index.html');

  await expect(page.getByRole('tab', { name: 'Зоны' })).toBeVisible();
  await page.getByRole('tab', { name: 'Зоны' }).click();
  await expect(page.getByTestId('project-structure')).toBeVisible();
  await expect(page.getByTestId('zone-editor')).toBeHidden();
  await expect(page.getByTestId('bom-spec')).toBeHidden();

  await page.getByTestId('zone-row-path').click();
  await expect(page.getByTestId('zone-editor')).toBeVisible();
  await expect(page.getByTestId('selected-zone-name')).toHaveText('Дорожка');
  await expect(page.getByTestId('project-structure')).toBeHidden();

  await page.getByRole('tab', { name: 'Ведомость' }).click();
  await expect(page.getByTestId('bom-spec')).toBeVisible();
  await expect(page.getByTestId('zone-editor')).toBeHidden();
  await page.getByRole('tab', { name: 'Редактор' }).click();
  await expect(page.getByTestId('selected-zone-name')).toHaveText('Дорожка');

  await page.getByRole('tab', { name: 'Зоны' }).click();
  await page.getByTestId('zone-row-bed').click();
  await expect(page.getByTestId('selected-zone-name')).toHaveText('Грядка');
  await expect(page.getByTestId('zone-dimensions')).toContainText('Длина2 м');
  await expect(page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).resolves.toBe(false);
  expect(errors).toEqual([]);
}

test('mobile zone navigation works at 390px and preserves the selected zone through BOM', async ({ page }) => {
  await assertMobileZoneNavigation(page, 390, 844);
});

test('tablet zone navigation works at 768px and preserves the selected zone through BOM', async ({ page }) => {
  await assertMobileZoneNavigation(page, 768, 900);
});

test('error state blocks the BOM instead of showing a partial total', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.goto('/artifacts/dachametr-workspace/index.html?state=error');
  await expect(page.getByTestId('blocked-bom')).toBeVisible();
  await expect(page.getByTestId('blocked-bom')).toContainText('Исправьте толщину слоя');
  await expect(page.getByTestId('bom-total-volume')).toHaveText('—');
  expect(errors).toEqual([]);
});

test('design board and comparison page render their committed visual evidence', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('/artifacts/dachametr-workspace/design-board.html');
  await expect(page.getByRole('heading', { name: 'Design system board' })).toBeVisible();
  await expect(page.getByText('Active zone')).toBeVisible();
  await expect(page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).resolves.toBe(false);

  await page.goto('/artifacts/dachametr-workspace/side-by-side.html');
  await expect(page.getByRole('heading', { name: /Почему это не PR #11 и не PR #12/ })).toBeVisible();
  await expect(page.locator('img')).toHaveCount(3);
  await expect(page.locator('img').nth(2)).toHaveJSProperty('naturalWidth', 1440);
  await expect(page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).resolves.toBe(false);
  expect(errors).toEqual([]);
});
