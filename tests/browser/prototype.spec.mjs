import { test, expect } from '@playwright/test';

function field(page, action, fieldName, index = 0) {
  return page.locator(`[data-action="${action}"][data-field="${fieldName}"]`).nth(index);
}

async function fillZone(page, index, { name, length, width }) {
  const zone = page.getByTestId('zone-card').nth(index);
  await zone.locator('[data-action="zone-field"][data-field="name"]').fill(name);
  await zone.locator('[data-action="zone-field"][data-field="length"]').fill(length);
  await zone.locator('[data-action="zone-field"][data-field="width"]').fill(width);
  return zone;
}

async function fillLayer(zone, { material, label, thickness, reserve = '0', packageL = '' }) {
  const layer = zone.getByTestId('layer-card').last();
  await layer.locator('[data-action="material-field"][data-field="material"]').selectOption(material);
  await layer.locator('[data-action="material-field"][data-field="label"]').fill(label);
  await layer.locator('[data-action="layer-field"][data-field="thickness"]').fill(thickness);
  await layer.locator('[data-action="layer-field"][data-field="reserve"]').fill(reserve);
  if (packageL) await layer.locator('[data-action="layer-field"][data-field="packageL"]').fill(packageL);
}

function attachRuntimeErrors(page) {
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', request => errors.push(`request: ${request.url()} ${request.failure()?.errorText ?? ''}`));
  return errors;
}

test('critical path calculates grouped materials and shows the zone breakdown', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Дачаметр' })).toBeVisible();

  await field(page, 'plot-field', 'length').fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  const first = await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
  await first.getByRole('button', { name: 'Добавить слой' }).click();
  await fillLayer(first, { material: 'soil', label: 'Грунт для грядок', thickness: '25', packageL: '50' });

  await page.getByTestId('add-zone').click();
  const second = await fillZone(page, 1, { name: 'Дорожка', length: '2', width: '5' });
  await second.getByRole('button', { name: 'Добавить слой' }).click();
  const soilLayer = second.getByTestId('layer-card').last();
  await soilLayer.locator('[data-action="link-material"]').selectOption('spec-1');
  await soilLayer.locator('[data-action="layer-field"][data-field="thickness"]').fill('6');
  await soilLayer.locator('[data-action="layer-field"][data-field="packageL"]').fill('50');
  await second.getByRole('button', { name: 'Добавить слой' }).click();
  await fillLayer(second, { material: 'sand', label: 'Песок', thickness: '10', reserve: '5', packageL: '50' });

  await expect(page.getByTestId('result-panel')).toBeVisible();
  await expect(page.getByTestId('bom-row')).toHaveCount(2);
  await expect(page.getByTestId('bom-row').first()).toContainText('Грунт для грядок');
  await expect(page.getByTestId('bom-row').nth(1)).toContainText('Песок');
  await expect(page.getByRole('heading', { name: 'Расшифровка по зонам' })).toBeVisible();
  await expect(page.getByText('52 уп.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('comma editing is preserved and an invalid late zone blocks the full BOM', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.goto('/');
  const plotLength = field(page, 'plot-field', 'length');
  await plotLength.fill('1,');
  await expect(plotLength).toHaveValue('1,');
  await expect(page.getByTestId('blocked-results')).toBeVisible();
  await plotLength.press('Backspace');
  await expect(field(page, 'plot-field', 'length')).toHaveValue('1');
  await field(page, 'plot-field', 'length').press('Backspace');
  await expect(field(page, 'plot-field', 'length')).toHaveValue('');
  await field(page, 'plot-field', 'length').type('1,');
  await expect(field(page, 'plot-field', 'length')).toHaveValue('1,');

  await plotLength.fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  const validZone = await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
  await validZone.getByRole('button', { name: 'Добавить слой' }).click();
  await fillLayer(validZone, { material: 'soil', label: 'Грунт', thickness: '25', packageL: '50' });
  await page.getByTestId('add-zone').click();
  await fillZone(page, 1, { name: 'Ошибка', length: 'bad', width: '2' });
  await expect(page.getByTestId('blocked-results')).toBeVisible();
  await expect(page.getByTestId('bom-row')).toHaveCount(0);
  await expect(page.getByText('Исправьте ошибки, чтобы получить итоговую ведомость')).toBeVisible();
  expect(errors).toEqual([]);
});

test('reload and back-forward navigation stay usable without promising persistence', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.goto('/');
  await field(page, 'plot-field', 'length').fill('20');
  await page.reload();
  await expect(field(page, 'plot-field', 'length')).toHaveValue('');
  await page.goto('/?navigation-probe=1');
  await page.goBack();
  await expect(page).toHaveTitle('Дачаметр — расчёт материалов участка');
  await page.goForward();
  await expect(page).toHaveTitle('Дачаметр — расчёт материалов участка');
  expect(errors).toEqual([]);
});

test('keyboard focus and responsive layout do not create horizontal overflow', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await field(page, 'plot-field', 'length').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAttribute('id', 'plot-width');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
});

test('responsive result-nearby zones and per-layer editing keep values while toggling', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await field(page, 'plot-field', 'length').fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  const first = await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
  await first.getByRole('button', { name: 'Добавить слой' }).click();
  await fillLayer(first, { material: 'soil', label: 'Грунт для грядок', thickness: '25', packageL: '50' });
  const layer = first.getByTestId('layer-card').first();
  await layer.getByRole('button', { name: 'Скрыть' }).click();
  await expect(layer.locator('.layer-edit')).toBeHidden();
  await expect(layer.getByText('Грунт для грядок').first()).toBeVisible();
  await layer.getByRole('button', { name: 'Настроить' }).click();
  await expect(layer.locator('[data-action="layer-field"][data-field="thickness"]')).toHaveValue('25');
  await page.locator('[data-action="mobile-tab"][data-target="zones"]').click();
  await page.getByTestId('add-zone').click();
  const second = page.getByTestId('zone-card').nth(1);
  await expect(first.locator('.zone-edit')).toBeHidden();
  await expect(second.locator('.zone-edit')).toBeVisible();
  await page.locator('[data-action="mobile-tab"][data-target="zones"]').click();
  await page.locator('[data-action="select-zone"]').first().click();
  await expect(first.locator('.zone-edit')).toBeVisible();
  await expect(second.locator('.zone-edit')).toBeHidden();
  await expect(first.locator('[data-action="zone-field"][data-field="name"]')).toHaveValue('Грядка');
  await expect(first.locator('[data-action="layer-field"][data-field="thickness"]')).toHaveValue('25');
  await expect(page.locator('.jump-result')).toHaveAttribute('href', '#result');
  expect(errors).toEqual([]);
});

test('result-nearby layout stays within the viewport at mobile tablet desktop and zoom emulation', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  for (const width of [195, 320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    if (overflow.scroll > overflow.client) {
      const offenders = await page.evaluate(() => Array.from(document.querySelectorAll('*')).map(el => {
        const rect = el.getBoundingClientRect();
        return { tag: el.tagName.toLowerCase(), cls: typeof el.className === 'string' ? el.className.slice(0, 80) : '',
          content: (el.textContent ?? '').trim().slice(0, 30), left: Math.round(rect.left), right: Math.round(rect.right) };
      }).filter(x => x.right > innerWidth + 0.5 || x.left < -0.5).sort((x, y) => y.right - x.right).slice(0, 12));
      throw new Error('horizontal overflow width ' + width + ': ' + JSON.stringify(overflow) + ' offenders ' + JSON.stringify(offenders));
    }
    expect(overflow.scroll, 'horizontal overflow at width ' + width).toBeLessThanOrEqual(overflow.client);
  }
  expect(errors).toEqual([]);
});

test('adding another layer collapses prior settings without changing domain values', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await field(page, 'plot-field', 'length').fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  const zone = await fillZone(page, 0, { name: 'Дорожка', length: '2', width: '5' });
  await zone.getByRole('button', { name: 'Добавить слой' }).click();
  await fillLayer(zone, { material: 'soil', label: 'Грунт', thickness: '6', packageL: '50' });
  const first = zone.getByTestId('layer-card').first();
  await zone.getByRole('button', { name: 'Добавить слой' }).click();
  const second = zone.getByTestId('layer-card').nth(1);
  await expect(first.locator('.layer-edit')).toBeHidden();
  await expect(second.locator('.layer-edit')).toBeVisible();
  await fillLayer(zone, { material: 'sand', label: 'Песок', thickness: '10', reserve: '5', packageL: '50' });
  await first.getByRole('button', { name: 'Настроить' }).click();
  await expect(first.locator('.layer-edit')).toBeVisible();
  await expect(second.locator('.layer-edit')).toBeHidden();
  await expect(first.locator('[data-action="layer-field"][data-field="thickness"]')).toHaveValue('6');
  await expect(second.locator('[data-action="layer-field"][data-field="thickness"]')).toHaveValue('10');
});

test('open BOM details remain open while editing and after temporary invalid input', async ({ page }) => {
  await page.goto('/');
  await field(page, 'plot-field', 'length').fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  const zone = await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
  await zone.getByRole('button', { name: 'Добавить слой' }).click();
  await fillLayer(zone, { material: 'soil', label: 'Грунт', thickness: '25', packageL: '50' });
  await page.getByTestId('bom-row').first().locator('.bom-details summary').click();
  await expect(page.getByTestId('bom-row').first().locator('.bom-details')).toHaveAttribute('open', '');
  await field(page, 'plot-field', 'length').fill('21');
  await expect(page.getByTestId('bom-row').first().locator('.bom-details')).toHaveAttribute('open', '');
  await field(page, 'plot-field', 'length').fill('1,');
  await expect(page.getByTestId('blocked-results')).toBeVisible();
  await field(page, 'plot-field', 'length').fill('21');
  await expect(page.getByTestId('bom-row').first().locator('.bom-details')).toHaveAttribute('open', '');
});

test('workspace mobile zone selection and BOM tabs operate on one live calculation', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('structure-panel')).toBeVisible();
  await expect(page.locator('[data-action="mobile-tab"][data-target="zones"]')).toHaveClass(/is-active/);
  await field(page, 'plot-field', 'length').fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  const first = await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
  await first.getByRole('button', { name: 'Добавить слой' }).click();
  await fillLayer(first, { material: 'soil', label: 'Грунт для грядок', thickness: '25', packageL: '50' });
  await page.locator('[data-action="mobile-tab"][data-target="zones"]').click();
  await page.getByTestId('add-zone').click();
  const second = await fillZone(page, 1, { name: 'Дорожка', length: '2', width: '5' });
  await second.getByRole('button', { name: 'Добавить слой' }).click();
  await fillLayer(second, { material: 'sand', label: 'Песок', thickness: '10', reserve: '5', packageL: '50' });
  await expect(page.getByTestId('selected-zone-name')).toHaveText('Дорожка');
  await page.locator('[data-action="mobile-tab"][data-target="bom"]').click();
  await expect(page.getByTestId('result-panel')).toBeVisible();
  await expect(page.getByTestId('bom-row')).toHaveCount(2);
  await page.locator('[data-action="mobile-tab"][data-target="zones"]').click();
  await page.locator('[data-action="select-zone"]').first().click();
  await expect(page.getByTestId('selected-zone-name')).toHaveText('Грядка');
  await expect(first.locator('[data-action="layer-field"][data-field="thickness"]')).toHaveValue('25');
  await page.locator('[data-action="mobile-tab"][data-target="bom"]').click();
  await expect(page.getByTestId('bom-row')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('linking existing material variant preserves selector focus after root rerender', async ({ page }) => {
  await page.goto('/');
  await field(page, 'plot-field', 'length').fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  const zone = await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
  await zone.getByRole('button', { name: 'Добавить слой' }).click();
  const select = zone.locator('[data-action="link-material"]').first();
  await select.selectOption('__new__');
  await expect(page.locator(':focus')).toHaveAttribute('data-action', 'link-material');
  await expect(page.locator(':focus')).toHaveAttribute('data-focus-key', /source-layer/);
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAttribute('data-action', 'material-field');
});

test('actual zone rectangles fit their own canvas and keep dimensions at all breakpoints', async ({ page }) => {
  await page.goto('/');
  await field(page, 'plot-field', 'length').fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
  await page.getByTestId('add-zone').click();
  await fillZone(page, 1, { name: 'Дорожка', length: '2', width: '5' });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [zoneIndex, ratio] of [[0, 2], [1, 2.5]]) {
      if (width <= 820) await page.locator('[data-action="mobile-tab"][data-target="zones"]').click();
      await page.locator('[data-action="select-zone"]').nth(zoneIndex).click();
      const rect = page.getByTestId('zone-rectangle');
      await expect(rect).toBeVisible();
      const geo = await rect.evaluate(element => {
        const box = element.getBoundingClientRect();
        const canvas = element.closest('.figure-canvas').getBoundingClientRect();
        const doc = document.documentElement;
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom,
          width: box.width, height: box.height, canvasLeft: canvas.left, canvasRight: canvas.right,
          canvasTop: canvas.top, canvasBottom: canvas.bottom,
          scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
      });
      expect(geo.scrollWidth, 'document overflow at ' + width).toBeLessThanOrEqual(geo.clientWidth);
      expect(geo.left, 'left boundary at ' + width).toBeGreaterThanOrEqual(geo.canvasLeft - 1);
      expect(geo.right, 'right boundary at ' + width).toBeLessThanOrEqual(geo.canvasRight + 1);
      expect(geo.top, 'top boundary at ' + width).toBeGreaterThanOrEqual(geo.canvasTop - 1);
      expect(geo.bottom, 'bottom boundary at ' + width).toBeLessThanOrEqual(geo.canvasBottom + 1);
      expect(geo.width / geo.height).toBeCloseTo(ratio, 2);
    }
  }
});

test('compact editor still exposes real layer and zone deletion on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await field(page, 'plot-field', 'length').fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  const zone = await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
  await zone.getByRole('button', { name: 'Добавить слой' }).click();
  await fillLayer(zone, { material: 'soil', label: 'Грунт', thickness: '25', packageL: '50' });
  await zone.getByRole('button', { name: 'Добавить слой' }).click();
  await fillLayer(zone, { material: 'sand', label: 'Песок', thickness: '10', packageL: '50' });
  await expect(zone.getByTestId('layer-card')).toHaveCount(2);
  await zone.getByRole('button', { name: 'Удалить слой 1' }).click();
  await expect(zone.getByTestId('layer-card')).toHaveCount(1);
  await expect(zone.getByTestId('layer-card').first()).toContainText('Песок');
  await page.locator('.editor-toolbar [data-action="remove-zone"]').click();
  await expect(page.getByTestId('zone-card')).toHaveCount(0);
  await expect(page.getByTestId('structure-panel')).toBeVisible();
});

test('mobile layer edit and delete actions do not overlap at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/');
  await field(page, 'plot-field', 'length').fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  const zone = await fillZone(page, 0, { name: 'Дорожка', length: '2', width: '5' });
  await zone.getByRole('button', { name: 'Добавить слой' }).click();
  const layer = zone.getByTestId('layer-card').first();
  const edit = layer.locator('.layer-toggle');
  const remove = layer.locator('.layer-remove');
  const boxes = await Promise.all([edit.boundingBox(), remove.boundingBox()]);
  expect(boxes[0]).not.toBeNull();
  expect(boxes[1]).not.toBeNull();
  const [a, b] = boxes;
  const overlap = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  expect(overlap).toBe(false);
  await edit.click();
  await expect(layer.locator('.layer-edit')).toBeHidden();
  await edit.click();
  await expect(layer.locator('.layer-edit')).toBeVisible();
  await remove.click();
  await expect(zone.getByTestId('layer-card')).toHaveCount(0);
});

test('mobile keyboard navigation retains focus after tab render and zone selection', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const editorTab = page.locator('[data-action="mobile-tab"][data-target="editor"]');
  const zonesTab = page.locator('[data-action="mobile-tab"][data-target="zones"]');
  await editorTab.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(':focus')).toHaveAttribute('data-focus-key', 'mobile-tab-editor');
  await expect(page.getByTestId('zone-editor')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator(':focus')).toHaveAttribute('data-target', 'zones');
  await page.keyboard.press('Enter');
  await expect(page.locator(':focus')).toHaveAttribute('data-focus-key', 'mobile-tab-zones');
  await field(page, 'plot-field', 'length').fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
  await zonesTab.click();
  const zoneSelect = page.locator('[data-action="select-zone"]').first();
  await zoneSelect.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'selected-zone-name');
  await expect(page.getByTestId('selected-zone-name')).toHaveText('Грядка');
  await expect(page.getByTestId('zone-editor')).toBeVisible();
});

test('tablet jump to BOM reveals the hidden panel and focuses it, desktop anchor remains native', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/');
  const jump = page.locator('.topbar .jump-result');
  await expect(jump).toHaveAttribute('href', '#result');
  await jump.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('workspace-layout')).toHaveAttribute('data-mobile-surface', 'bom');
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator(':focus')).toHaveAttribute('id', 'result');
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/');
  await page.locator('.topbar .jump-result').click();
  await expect(page).toHaveURL(/#result$/);
  await expect(page.locator('#result')).toBeVisible();
});

test('three-pane workspace fits widths just above mobile breakpoint', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  for (const width of [821, 834, 900, 990, 1100]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await field(page, 'plot-field', 'length').fill('20');
    await field(page, 'plot-field', 'width').fill('30');
    await page.getByTestId('add-zone').click();
    const zone = await fillZone(page, 0, { name: 'Дорожка', length: '2', width: '5' });
    await zone.getByRole('button', { name: 'Добавить слой' }).click();
    await fillLayer(zone, { material: 'sand', label: 'Песок', thickness: '10', reserve: '5', packageL: '50' });
    await expect(page.getByTestId('result-panel')).toBeVisible();
    const metrics = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(metrics.scroll, 'horizontal overflow at ' + width).toBeLessThanOrEqual(metrics.client);
  }
  expect(errors).toEqual([]);
});

test('adding, deleting and resetting workspace items retains keyboard focus on a usable control', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.getByTestId('add-zone').click();
    const zone = page.getByTestId('zone-card').first();
    const name = zone.locator('[data-action="zone-field"][data-field="name"]');
    await expect(name).toBeFocused();

    await zone.getByRole('button', { name: 'Добавить слой' }).click();
    const layer = zone.getByTestId('layer-card').first();
    await expect(layer.locator('[data-action="link-material"]')).toBeFocused();

    await layer.getByRole('button', { name: 'Удалить слой 1' }).click();
    await expect(zone.getByRole('button', { name: 'Добавить слой' })).toBeFocused();

    await page.locator('.editor-actions [data-action="remove-zone"]').click();
    await expect(page.locator('[data-focus-key="plot-length"]')).toBeFocused();
    await page.getByTestId('add-zone').click();
    await expect(zone.locator('[data-action="zone-field"][data-field="name"]')).toBeFocused();

    page.once('dialog', dialog => dialog.accept());
    await page.locator('.editor-actions [data-action="reset"]').click();
    await expect(page.locator('[data-focus-key="plot-length"]')).toBeFocused();
    await expect(page.getByTestId('zone-card')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('layer diagram control preserves keyboard focus through DOM replacement', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await field(page, 'plot-field', 'length').fill('20');
    await field(page, 'plot-field', 'width').fill('30');
    await page.getByTestId('add-zone').click();
    const zone = await fillZone(page, 0, { name: 'Дорожка', length: '2', width: '5' });
    await zone.getByRole('button', { name: 'Добавить слой' }).click();
    await fillLayer(zone, { material: 'sand', label: 'Песок', thickness: '10', reserve: '5', packageL: '50' });
    const diagramLayer = page.locator('.section-layer').first();
    await expect(diagramLayer).toBeVisible();
    await diagramLayer.focus();
    await page.keyboard.press('Enter');
    await expect(diagramLayer).toBeFocused();
    await expect(zone.getByTestId('layer-card').first().locator('.layer-edit')).toBeHidden();
    await page.keyboard.press('Enter');
    await expect(diagramLayer).toBeFocused();
    await expect(zone.getByTestId('layer-card').first().locator('.layer-edit')).toBeVisible();
    const before = await zone.locator('[data-action="zone-field"][data-field="name"]').inputValue();
    await page.locator('form.calculator-form').evaluate(form => form.requestSubmit());
    await expect(zone.locator('[data-action="zone-field"][data-field="name"]')).toHaveValue(before);
    await expect(page).toHaveURL(/\/$/);
  }
  expect(errors).toEqual([]);
});

test('reset drops old BOM expansion when newly created materials reuse the same IDs', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const createMaterial = async () => {
      await field(page, 'plot-field', 'length').fill('20');
      await field(page, 'plot-field', 'width').fill('30');
      await page.getByTestId('add-zone').click();
      const zone = await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
      await zone.getByRole('button', { name: 'Добавить слой' }).click();
      await fillLayer(zone, { material: 'soil', label: 'Грунт', thickness: '25', packageL: '50' });
      if (width <= 820) await page.locator('[data-action="mobile-tab"][data-target="bom"]').click();
    };
    await createMaterial();
    const details = page.getByTestId('bom-row').first().locator('.bom-details');
    const previousKey = await details.getAttribute('data-bom-key');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
    if (width <= 820) await page.locator('[data-action="mobile-tab"][data-target="editor"]').click();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('.editor-actions [data-action="reset"]').click();
    await expect(page.getByTestId('bom-row')).toHaveCount(0);
    await createMaterial();
    await expect(details).toHaveAttribute('data-bom-key', previousKey);
    await expect(details).not.toHaveAttribute('open', '');
  }
  expect(errors).toEqual([]);
});

test('IME input composition does not replace a live input until the composed text is committed', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.getByTestId('add-zone').click();
    const interim = await page.evaluate(() => {
      const input = document.querySelector('[data-action="zone-field"][data-field="name"]');
      if (!(input instanceof HTMLInputElement)) throw new Error('zone name input not found');
      input.focus();
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
      input.value = 'Северн';
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: 'Северн', isComposing: true }));
      return { attached: input.isConnected, focused: document.activeElement === input, value: input.value };
    });
    expect(interim).toEqual({ attached: true, focused: true, value: 'Северн' });
    await page.evaluate(() => {
      const input = document.querySelector('[data-action="zone-field"][data-field="name"]');
      if (!(input instanceof HTMLInputElement)) throw new Error('zone name input disappeared before IME commit');
      input.value = 'Северная грядка';
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: 'Северная грядка', isComposing: true }));
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'Северная грядка' }));
    });
    await expect(page.getByTestId('selected-zone-name')).toHaveText('Северная грядка');
    await expect(page.locator('[data-action="zone-field"][data-field="name"]')).toHaveValue('Северная грядка');
    await expect(page.locator('[data-action="zone-field"][data-field="name"]')).toBeFocused();
    // A subsequent ordinary input must still update the same model.
    await page.locator('[data-action="zone-field"][data-field="name"]').fill('Дорожка');
    await expect(page.getByTestId('selected-zone-name')).toHaveText('Дорожка');
  }
  expect(errors).toEqual([]);
});

test('desktop to mobile breakpoint keeps the focused editor or BOM surface without replacing inputs', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.setViewportSize({ width: 1024, height: 844 });
  await page.goto('/');
  await field(page, 'plot-field', 'length').fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  const zone = await fillZone(page, 0, { name: 'Дорожка', length: '2', width: '5' });
  await zone.getByRole('button', { name: 'Добавить слой' }).click();
  await fillLayer(zone, { material: 'sand', label: 'Песок', thickness: '10', packageL: '50' });
  const input = zone.locator('[data-action="layer-field"][data-field="thickness"]');
  const isSameNode = await input.evaluate(el => { el.dataset.resizeSentinel = 'retained'; return true; });
  expect(isSameNode).toBe(true);
  await input.focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('workspace-layout')).toHaveAttribute('data-mobile-surface', 'editor');
  await expect(page.locator('[data-action="mobile-tab"][data-target="editor"]')).toHaveAttribute('aria-current', 'page');
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('data-resize-sentinel', 'retained');
  await input.fill('11');
  await expect(input).toHaveValue('11');
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(input).toBeFocused();
  const summary = page.getByTestId('bom-row').first().locator('.bom-details summary');
  await summary.focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('workspace-layout')).toHaveAttribute('data-mobile-surface', 'bom');
  await expect(page.locator('[data-action="mobile-tab"][data-target="bom"]')).toHaveAttribute('aria-current', 'page');
  await expect(summary).toBeVisible();
  await expect(summary).toBeFocused();
  expect(errors).toEqual([]);
});

test('mobile to desktop and tablet to phone resize relocates hidden navigation focus', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('add-zone').click();
  const editorTab = page.locator('[data-action="mobile-tab"][data-target="editor"]');
  await editorTab.focus();
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(page.getByTestId('selected-zone-name')).toBeFocused();
  await page.locator('[data-focus-key="plot-length"]').focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('workspace-layout')).toHaveAttribute('data-mobile-surface', 'zones');
  await expect(page.locator('[data-focus-key="plot-length"]')).toBeFocused();
  await page.setViewportSize({ width: 768, height: 1024 });
  const jump = page.locator('.topbar .jump-result');
  await expect(jump).toBeVisible();
  await jump.focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(jump).toBeHidden();
  await expect(page.getByTestId('workspace-layout')).toHaveAttribute('data-mobile-surface', 'bom');
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#result')).toBeFocused();
  expect(errors).toEqual([]);
});

test('empty editor tab does not leave focus on hidden mobile navigation after desktop resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const tab = page.locator('[data-action="mobile-tab"][data-target="editor"]');
  await tab.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('selected-zone-name')).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(page.locator('.editor-surface [data-action="add-zone"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('zone-card')).toHaveCount(1);
});

test('reset requests confirmation for plot dimensions even without any zones', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await field(page, 'plot-field', 'length').fill('18');
    await field(page, 'plot-field', 'width').fill('25');
    await expect(page.getByTestId('zone-card')).toHaveCount(0);
    if (width <= 820) await page.locator('[data-action="mobile-tab"][data-target="editor"]').click();

    let dismissed = false;
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Сбросить введённые размеры');
      dismissed = true;
      await dialog.dismiss();
    });
    await page.locator('.editor-actions [data-action="reset"]').click();
    expect(dismissed, 'unsaved plot values require explicit confirmation').toBe(true);
    await expect(field(page, 'plot-field', 'length')).toHaveValue('18');
    await expect(field(page, 'plot-field', 'width')).toHaveValue('25');

    let accepted = false;
    page.once('dialog', async dialog => {
      accepted = true;
      await dialog.accept();
    });
    await page.locator('.editor-actions [data-action="reset"]').click();
    expect(accepted).toBe(true);
    await expect(field(page, 'plot-field', 'length')).toHaveValue('');
    await expect(field(page, 'plot-field', 'width')).toHaveValue('');
    await expect(page.getByTestId('zone-card')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('blank material variant label exposes a visible inline error and accessible description', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await field(page, 'plot-field', 'length').fill('20');
    await field(page, 'plot-field', 'width').fill('30');
    await page.getByTestId('add-zone').click();
    const zone = await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
    await zone.getByRole('button', { name: 'Добавить слой' }).click();
    await fillLayer(zone, { material: 'soil', label: 'Грунт', thickness: '25', packageL: '50' });
    const label = zone.locator('[data-action="material-field"][data-field="label"]');
    await label.fill('');
    await expect(label).toHaveAttribute('aria-invalid', 'true');
    const errorId = await label.getAttribute('aria-describedby');
    expect(errorId).toMatch(/^error-label-layer-/);
    await expect(page.locator('[id="' + errorId + '"]')).toHaveText('Добавьте название варианта материала.');
    if (width <= 820) await page.locator('[data-action="mobile-tab"][data-target="bom"]').click();
    await expect(page.getByTestId('blocked-results')).toBeVisible();
    if (width <= 820) await page.locator('[data-action="mobile-tab"][data-target="editor"]').click();
    await label.fill('Грунт для грядок');
    await expect(label).toHaveAttribute('aria-invalid', 'false');
    await expect(label).not.toHaveAttribute('aria-describedby', /error-label/);
    await expect(page.getByTestId('result-panel')).toBeAttached();
  }
  expect(errors).toEqual([]);
});

test('copying the exact purchase list works on mobile and desktop without external requests', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4173' });
  for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await field(page, 'plot-field', 'length').fill('20');
    await field(page, 'plot-field', 'width').fill('30');
    await page.getByTestId('add-zone').click();
    const zone = await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
    await zone.getByRole('button', { name: 'Добавить слой' }).click();
    await fillLayer(zone, { material: 'soil', label: 'Грунт для грядок', thickness: '25', packageL: '50' });
    if (width <= 820) await page.locator('[data-action="mobile-tab"][data-target="bom"]').click();
    const copy = page.locator('[data-action="copy-bom"]');
    await expect(copy).toBeVisible();
    await copy.click();
    await expect(page.getByTestId('copy-bom-status')).toHaveText('Ведомость скопирована.');
    const value = await page.evaluate(() => navigator.clipboard.readText());
    expect(value).toContain('Дачаметр — ведомость закупки');
    expect(value).toContain('Грунт для грядок (Грунт, spec-1)');
    expect(value).toContain('Нужно с запасом: 2 000 л');
    expect(value).toContain('Купить: 40 уп. × 50 л');
    expect(value).toContain('Излишек: 0 л');
    expect(value).not.toContain('undefined');

    if (width <= 820) await page.locator('[data-action="mobile-tab"][data-target="editor"]').click();
    await zone.locator('[data-action="zone-field"][data-field="length"]').fill('1,');
    if (width <= 820) await page.locator('[data-action="mobile-tab"][data-target="bom"]').click();
    await expect(page.getByTestId('blocked-results')).toBeVisible();
    await expect(page.locator('[data-action="copy-bom"]')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('clipboard permission failure is announced without false success or navigation', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('Permission denied')) },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await field(page, 'plot-field', 'length').fill('20');
  await field(page, 'plot-field', 'width').fill('30');
  await page.getByTestId('add-zone').click();
  const zone = await fillZone(page, 0, { name: 'Грядка', length: '2', width: '4' });
  await zone.getByRole('button', { name: 'Добавить слой' }).click();
  await fillLayer(zone, { material: 'soil', label: 'Грунт', thickness: '25', packageL: '50' });
  await page.locator('[data-action="mobile-tab"][data-target="bom"]').click();
  await page.locator('[data-action="copy-bom"]').click();
  await expect(page.getByTestId('copy-bom-status')).toHaveText('Не удалось скопировать. Проверьте разрешение на буфер обмена.');
  await expect(page.getByTestId('result-panel')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(errors).toEqual([]);
});
test('versioned fragment link restores complete zone/material calculation and avoids stale reload', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4173' });
  for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?utm_test=private-value');
    await field(page, 'plot-field', 'length').fill('20,5');
    await field(page, 'plot-field', 'width').fill('30');
    await page.getByTestId('add-zone').click();
    const zone = await fillZone(page, 0, { name: 'Северная грядка', length: '2', width: '4' });
    await zone.getByRole('button', { name: 'Добавить слой' }).click();
    await fillLayer(zone, { material: 'soil', label: 'Грунт для ёлки', thickness: '25', reserve: '5', packageL: '50' });
    if (width <= 820) await page.locator('[data-action="mobile-tab"][data-target="bom"]').click();
    await page.locator('[data-action="share-calculation"]').click();
    await expect(page.getByTestId('share-link-status')).toContainText('Ссылка скопирована');
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toMatch(/^http:\/\/127\.0\.0\.1:4173\/#dm=1\./);
    expect(url).not.toContain('utm_test');
    expect(new URL(url).hash.length).toBeLessThanOrEqual(8192);

    const imported = await page.context().newPage();
    await imported.setViewportSize({ width, height: 844 });
    await imported.goto(url);
    await expect(imported.getByTestId('share-load-notice')).toContainText('восстановлен из ссылки');
    await expect(field(imported, 'plot-field', 'length')).toHaveValue('20,5');
    await expect(field(imported, 'plot-field', 'width')).toHaveValue('30');
    await expect(imported.getByTestId('bom-row')).toHaveCount(1);
    await expect(imported.getByTestId('bom-row').first()).toContainText('Грунт для ёлки');
    await expect(imported.getByTestId('bom-row').first()).toContainText('42 уп.');
    if (width <= 820) {
      await expect(imported.getByTestId('workspace-layout')).toHaveAttribute('data-mobile-surface', 'bom');
      await imported.locator('[data-action="mobile-tab"][data-target="editor"]').click();
    }
    await expect(imported.getByTestId('selected-zone-name')).toContainText('Северная грядка');
    await expect(imported.locator('[data-action="material-field"][data-field="label"]')).toHaveValue('Грунт для ёлки');
    await field(imported, 'plot-field', 'width').fill('31');
    await expect(imported).toHaveURL(/\/$/);
    await imported.reload();
    await expect(field(imported, 'plot-field', 'length')).toHaveValue('');
    await expect(field(imported, 'plot-field', 'width')).toHaveValue('');
    await expect(imported.getByTestId('share-load-notice')).toHaveCount(0);
    await imported.close();
  }
  expect(errors).toEqual([]);
});

test('invalid, unsupported and markup-bearing shared links cannot silently poison the calculator', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await field(page, 'plot-field', 'length').fill('20');
  await page.goto('/#dm=9.AAAA');
  await expect(page.getByTestId('share-load-notice')).toContainText('Версия ссылки не поддерживается');
  await expect(field(page, 'plot-field', 'length')).toHaveValue('');
  await page.goto('/#dm=1.AAAA');
  await expect(page.getByTestId('share-load-notice')).toContainText('Ссылка повреждена');

  const payload = {
    v: 1,
    p: ['20', '30'],
    m: [['spec-1', 'soil', 'Грунт']],
    z: [['zone-1', '<img src=x onerror=alert(1)>', '2', '4', [['layer-1', 'spec-1', '25', '0', '50', '']]]],
  };
  const fragment = '#dm=1.' + Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  await page.goto('/' + fragment);
  await expect(page.getByTestId('share-load-notice')).toContainText('восстановлен');
  await expect(page.getByTestId('selected-zone-name')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  await expect(page.getByTestId('bom-row')).toHaveCount(1);
  expect(errors).toEqual([]);
});
