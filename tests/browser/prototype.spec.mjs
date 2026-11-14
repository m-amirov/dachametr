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
  await expect(page.getByRole('link', { name: /К ведомости/ })).toHaveAttribute('href', '#results-panel');
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
  const invalidZoneLength = page.getByTestId('zone-card').nth(1).locator('[data-action="zone-field"][data-field="length"]');
  await expect(invalidZoneLength).toHaveAttribute('aria-describedby', 'zone-length-zone-2-error');
  await expect(page.locator('#zone-length-zone-2-error')).toContainText('Введите число');
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

test('200 percent css viewport keeps the atlas header inside the viewport', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  await page.setViewportSize({ width: 195, height: 844 });
  await page.goto('/');
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    brandRight: document.querySelector('.brand-area')?.getBoundingClientRect().right ?? 0,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.brandRight).toBeLessThanOrEqual(metrics.clientWidth);
  expect(errors).toEqual([]);
});

test('header text and session state do not geometrically overlap at responsive widths', async ({ page }) => {
  const errors = attachRuntimeErrors(page);
  const widths = [1024, 960, 961, 1100, 1200, 1280, 1440, 320, 390, 195];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const metrics = await page.evaluate(() => {
      const readRect = selector => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      };
      const readRenderedTextRect = selector => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const range = document.createRange();
        range.selectNodeContents(element);
        const rect = range.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      };
      const intersects = (first, second) => Boolean(
        first && second
        && first.left < second.right
        && first.right > second.left
        && first.top < second.bottom
        && first.bottom > second.top,
      );
      const heading = readRect('.site-header h1');
      const headingText = readRenderedTextRect('.site-header h1');
      const description = readRect('.site-intro');
      const state = readRect('.session-note');
      return {
        heading,
        headingText,
        description,
        state,
        overlaps: {
          headingDescription: intersects(heading, description),
          renderedHeadingDescription: intersects(headingText, description),
          headingState: intersects(heading, state),
          renderedHeadingState: intersects(headingText, state),
          descriptionState: intersects(description, state),
        },
      };
    });

    expect(metrics.overlaps, `header geometry at ${width}px: ${JSON.stringify(metrics)}`).toEqual({
      headingDescription: false,
      renderedHeadingDescription: false,
      headingState: false,
      renderedHeadingState: false,
      descriptionState: false,
    });
  }

  expect(errors).toEqual([]);
});
