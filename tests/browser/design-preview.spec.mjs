import { test, expect } from '@playwright/test';

test('local design selector changes only the visual variant and preserves URL fragments', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?select&keep=1#result');
  const panel = page.getByTestId('dm-design-preview');
  await expect(panel).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-dm-preview', /./);
  await expect(panel.locator('[data-preview-variant="rayon"]')).toHaveAttribute('aria-pressed', 'true');

  await panel.locator('[data-preview-variant="atlas"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-dm-preview', 'atlas');
  await expect(panel.locator('[data-preview-variant="atlas"]')).toHaveAttribute('aria-pressed', 'true');
  expect(new URL(page.url()).searchParams.get('keep')).toBe('1');
  expect(new URL(page.url()).hash).toBe('#result');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-dm-preview', 'atlas');
  await page.getByTestId('dm-design-preview').locator('[data-preview-variant="ledger"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-dm-preview', 'ledger');
  await page.goBack();
  await expect(page.locator('html')).toHaveAttribute('data-dm-preview', 'atlas');

  await page.getByTestId('dm-design-preview').getByRole('button', { name: 'Скрыть панель' }).click();
  await expect(page.getByTestId('dm-design-preview')).toBeHidden();
  expect(new URL(page.url()).searchParams.has('select')).toBe(false);
  await expect(page.locator('html')).toHaveAttribute('data-dm-preview', 'atlas');
});

test('default UI remains unchanged and invalid preview query falls back safely', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('dm-design-preview')).toBeHidden();
  await expect(page.locator('html')).not.toHaveAttribute('data-dm-preview', /./);

  await page.goto('/?dm-variant=unknown');
  await expect(page.getByTestId('dm-design-preview')).toBeHidden();
  await expect(page.locator('html')).not.toHaveAttribute('data-dm-preview', /./);
  await expect(page.locator('body')).toBeVisible();
});

test('variants preserve three-panel desktop and no horizontal overflow at mobile widths', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const variant of ['rayon', 'atlas', 'ledger']) {
      const query = variant === 'rayon' ? '' : '?dm-variant=' + variant;
      await page.goto('/' + query);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        panel: Boolean(document.querySelector('.workspace-grid')),
        root: Boolean(document.querySelector('#app')),
      }));
      expect(metrics.scrollWidth, width + 'px / ' + variant).toBeLessThanOrEqual(metrics.clientWidth + 1);
      expect(metrics.panel).toBe(true);
      expect(metrics.root).toBe(true);
    }
  }
});
