import { test, expect } from '@playwright/test';

async function populate(page) {
  await page.goto('/');
  await page.locator('[data-action="plot-field"][data-field="length"]').fill('20');
  await page.locator('[data-action="plot-field"][data-field="width"]').fill('30');
  await page.getByTestId('add-zone').click();
  const zone = page.getByTestId('zone-card').first();
  await zone.locator('[data-action="zone-field"][data-field="name"]').fill('Дорожка');
  await zone.locator('[data-action="zone-field"][data-field="length"]').fill('2');
  await zone.locator('[data-action="zone-field"][data-field="width"]').fill('5');
  await zone.getByRole('button', { name: 'Добавить слой' }).click();
  const soil = zone.getByTestId('layer-card').last();
  await soil.locator('[data-action="material-field"][data-field="material"]').selectOption('soil');
  await soil.locator('[data-action="material-field"][data-field="label"]').fill('Плодородный грунт');
  await soil.locator('[data-action="layer-field"][data-field="thickness"]').fill('6');
  await soil.locator('[data-action="layer-field"][data-field="reserve"]').fill('0');
  await zone.getByRole('button', { name: 'Добавить слой' }).click();
  const sand = zone.getByTestId('layer-card').last();
  await sand.locator('[data-action="material-field"][data-field="material"]').selectOption('sand');
  await sand.locator('[data-action="material-field"][data-field="label"]').fill('Песок');
  await sand.locator('[data-action="layer-field"][data-field="thickness"]').fill('10');
  await sand.locator('[data-action="layer-field"][data-field="reserve"]').fill('0');
  return zone;
}

test('dynamic material illustration matches entered layers without invented materials', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const zone = await populate(page);
  const artwork = page.getByTestId('material-cutaway');
  await expect(artwork).toBeVisible();
  await expect(artwork.locator('g[data-stratum]')).toHaveCount(2);
  await expect(artwork.locator('g[data-material-kind="soil"]')).toHaveCount(1);
  await expect(artwork.locator('g[data-material-kind="sand"]')).toHaveCount(1);
  await expect(artwork.locator('g[data-material-kind="gravel"]')).toHaveCount(0);
  await expect(artwork.locator('svg[role="img"]')).toHaveAttribute('aria-labelledby', /section-/);
  await expect(page.locator('.section-layer')).toHaveCount(2);
  await expect(page.locator('.section-layer').first()).toContainText('6 см');
  await expect(page.locator('.section-layer').nth(1)).toContainText('10 см');
  await page.locator('.section-layer').first().click();
  await expect(page.locator('.section-layer').first()).toBeFocused();
  await expect(zone.getByTestId('layer-card').first().locator('.layer-edit')).toBeVisible();
});

test('layer thickness change updates axonometric proportions, not geometry or BOM semantics', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const zone = await populate(page);
  const stratum = page.getByTestId('material-cutaway').locator('g[data-material-kind="sand"] path').first();
  const before = await stratum.getAttribute('d');
  await zone.getByTestId('layer-card').last().locator('[data-action="layer-field"][data-field="thickness"]').fill('20');
  const after = await page.getByTestId('material-cutaway').locator('g[data-material-kind="sand"] path').first().getAttribute('d');
  expect(after).not.toEqual(before);
  await expect(page.getByTestId('zone-rectangle')).toHaveAttribute('data-ratio', '2.5');
  await expect(page.getByTestId('result-panel')).toBeVisible();
  await expect(page.locator('.section-layer').nth(1)).toContainText('20 см');
});

test('invalid material cannot produce a misleading cutaway and remains fail-closed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const zone = await populate(page);
  await expect(page.getByTestId('material-cutaway')).toBeAttached();
  await zone.getByTestId('layer-card').last().locator('[data-action="layer-field"][data-field="thickness"]').fill('1,');
  await expect(page.getByTestId('material-cutaway')).toHaveCount(0);
  await page.locator('[data-action="mobile-tab"][data-target="bom"]').click();
  await expect(page.getByTestId('blocked-results')).toBeVisible();
  await expect(page.getByTestId('bom-row')).toHaveCount(0);
});

test('material visualization remains within viewport at mobile/tablet/desktop sizes', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await populate(page);
    const rect = page.getByTestId('zone-rectangle');
    await expect(rect).toBeVisible();
    await expect(page.getByTestId('material-cutaway')).toBeVisible();
    const values = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(values.scroll, `overflow at ${width}`).toBeLessThanOrEqual(values.client);
  }
});
