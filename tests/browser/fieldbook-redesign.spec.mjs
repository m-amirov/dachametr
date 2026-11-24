import { test, expect } from '@playwright/test';

test('Garden Atlas presents plot settings, horizontal zone navigation and visual editor', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.site-overview [data-action="plot-field"][data-field="length"]')).toBeVisible();
  await expect(page.locator('.site-overview [data-action="plot-field"][data-field="width"]')).toBeVisible();
  await expect(page.getByTestId('empty-zone-sketch')).toBeVisible();
  await expect(page.getByTestId('empty-zone-sketch')).toHaveAttribute('aria-hidden', 'true');
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

test('Garden Atlas uses the visual-first workspace and full-width result, not three permanent panels', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('[data-action="plot-field"][data-field="length"]').fill('20');
  await page.locator('[data-action="plot-field"][data-field="width"]').fill('30');
  await page.getByTestId('add-zone').click();
  const zone = page.getByTestId('zone-card').first();
  await zone.locator('[data-action="zone-field"][data-field="length"]').fill('4');
  await zone.locator('[data-action="zone-field"][data-field="width"]').fill('4');
  await zone.getByRole('button', { name: 'Добавить слой' }).click();
  const layer = zone.getByTestId('layer-card').first();
  await layer.locator('[data-action="material-field"][data-field="material"]').selectOption('gravel');
  await layer.locator('[data-action="material-field"][data-field="label"]').fill('Щебень');
  await layer.locator('[data-action="layer-field"][data-field="thickness"]').fill('10');
  await layer.locator('[data-action="layer-field"][data-field="reserve"]').fill('0');
  await expect(page.locator('.atlas-plan')).toHaveAttribute('data-surface-material','gravel');
  await expect(page.getByTestId('material-cutaway').locator('g[data-material-kind="gravel"]')).toHaveCount(1);
  const plan = await page.locator('.atlas-plan').boundingBox();
  const inspector = await page.locator('.atlas-inspector').boundingBox();
  const editor = await page.getByTestId('zone-editor').boundingBox();
  const bom = await page.getByTestId('result-panel').boundingBox();
  expect(plan.width).toBeGreaterThan(inspector.width);
  expect(plan.x + plan.width).toBeLessThan(inspector.x + 1);
  expect(bom.y).toBeGreaterThanOrEqual(editor.y + editor.height);
  expect(Math.abs(bom.width - editor.width)).toBeLessThan(2);
  for (const name of ['grass','soil','sand','gravel','context']) {
    const decoded = await page.evaluate(async (name) => {
      const image = new Image(); image.src = '/atlas/' + name + '.webp';
      await image.decode();
      return image.naturalWidth > 0 && image.naturalHeight > 0;
    }, name);
    expect(decoded).toBe(true);
  }
  await layer.locator('[data-action="material-field"][data-field="material"]').selectOption('soil');
  await expect(page.locator('.atlas-plan')).toHaveAttribute('data-surface-material','soil');
});

test('Atlas scene uses actual orthogonal dimensions with a common projection scale and preserves the selected view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.locator('[data-action="plot-field"][data-field="length"]').fill('20');
  await page.locator('[data-action="plot-field"][data-field="width"]').fill('30');
  await page.getByTestId('add-zone').click();
  const zone = page.getByTestId('zone-card').first();
  const length = zone.locator('[data-action="zone-field"][data-field="length"]');
  const width = zone.locator('[data-action="zone-field"][data-field="width"]');
  await length.fill('2');
  await width.fill('5');
  const scene = page.getByTestId('atlas-scene');
  const footprint = scene.getByTestId('atlas-scene-footprint');
  await expect(scene).toBeVisible();
  await expect(scene).toHaveAttribute('data-scene-material','none');
  await expect(scene).toHaveAttribute('data-scene-ratio','2.5');
  const edgeRatio = async () => await footprint.evaluate(el => {
    const points = el.points;
    const distance = (a,b) => Math.hypot(points[a].x-points[b].x,points[a].y-points[b].y);
    return distance(0,1)/distance(1,2);
  });
  expect(await edgeRatio()).toBeCloseTo(2.5,3);
  const original = await footprint.getAttribute('points');
  await width.fill('3');
  expect(await edgeRatio()).toBeCloseTo(1.5,3);
  expect(await footprint.getAttribute('points')).not.toEqual(original);
  const plan = page.locator('[data-action="scene-view"][data-target="plan"]');
  await plan.click();
  await expect(plan).toBeFocused();
  await expect(plan).toHaveAttribute('aria-pressed','true');
  await expect(page.getByTestId('zone-rectangle')).toBeVisible();
  await width.fill('4');
  await expect(plan).toHaveAttribute('aria-pressed','true');
  await expect(page.getByTestId('zone-rectangle')).toHaveAttribute('data-ratio','2');
  await page.locator('[data-action="scene-view"][data-target="scene"]').click();
  await expect(scene).toBeVisible();
  expect(await edgeRatio()).toBeCloseTo(2,3);
  await width.fill('1,');
  await expect(scene).toHaveCount(0);
  await expect(page.getByTestId('blocked-results')).toBeVisible();
});
