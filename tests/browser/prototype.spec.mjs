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
  await page.getByTestId('add-zone').click();
  const second = page.getByTestId('zone-card').nth(1);
  await expect(first.locator('.zone-edit')).toBeHidden();
  await expect(second.locator('.zone-edit')).toBeVisible();
  await first.locator('[data-action="toggle-zone"]').click();
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
