import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const baseURL = process.env.EVIDENCE_BASE_URL ?? 'http://127.0.0.1:4173';
const evidenceDir = path.resolve(process.env.EVIDENCE_DIR ?? 'artifacts/ui-evidence/local');
const widths = [320, 390, 768, 1024, 1440];
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const sourceFiles = ['index.html', 'src/styles.css', 'src/ui/app.ts', 'src/ui/model.ts', 'src/ui/validation.ts', 'src/domain/plot.ts', 'src/domain/exact.ts'];
const sourceSha = git('rev-parse', 'HEAD');
const dirty = git('status', '--porcelain=v1', '--untracked-files=all');
if (dirty) throw new Error('Capture requires a clean checkout: ' + dirty);
const sourceDigest = createHash('sha256');
const sourceChecksums = [];
for (const file of sourceFiles) {
  const bytes = await readFile(file);
  sourceDigest.update(file + '\0');
  sourceDigest.update(bytes);
  sourceDigest.update('\0');
  sourceChecksums.push({ file, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const source = { commitSha: sourceSha, dirty: false, sourceDigestSha256: sourceDigest.digest('hex'), sourceFiles: sourceChecksums };


function field(page, action, fieldName) {
  return page.locator(`[data-action="${action}"][data-field="${fieldName}"]`).first();
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

async function fillResultScenario(page) {
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
  await page.getByTestId('result-panel').waitFor();
}

async function capture(browser, width, state) {
  const height = width <= 390 ? 844 : width === 768 ? 1024 : 900;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', request => errors.push(`request: ${request.url()} ${request.failure()?.errorText ?? ''}`));
  await page.goto(`${baseURL}/`);
  if (state === 'error') await field(page, 'plot-field', 'length').fill('bad');
  if (state === 'result') await fillResultScenario(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  // Full-page screenshots must start at the real top of the page; the last input
  // is otherwise still focused/scrolled, shifting the sticky BOM in evidence.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(100);
  const filename = `${state}-${width}.png`;
  const screenshotPath = path.join(evidenceDir, filename);
  await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' });
  const bytes = await readFile(screenshotPath);
  await page.close();
  return { state, width, height, overflow, errors, filename, pngSha256: createHash('sha256').update(bytes).digest('hex') };
}

await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch();
const checks = [];
for (const width of widths) {
  checks.push(await capture(browser, width, 'initial'));
  checks.push(await capture(browser, width, 'error'));
  checks.push(await capture(browser, width, 'result'));
}

// A 195px CSS viewport emulates the layout viewport of a 390px device at 200% browser zoom.
// It is intentionally reported as an emulation, not as a physical-device observation.
const zoomPage = await browser.newPage({ viewport: { width: 195, height: 844 }, deviceScaleFactor: 1 });
await zoomPage.goto(`${baseURL}/`);
const zoomOverflow = await zoomPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const zoomFile = 'initial-195-zoom-emulation.png';
await zoomPage.screenshot({ path: path.join(evidenceDir, zoomFile), fullPage: true, animations: 'disabled' });
const zoomBytes = await readFile(path.join(evidenceDir, zoomFile));
checks.push({ state: 'zoom-200-css-viewport', width: 195, height: 844, overflow: zoomOverflow, errors: [], filename: zoomFile, pngSha256: createHash('sha256').update(zoomBytes).digest('hex') });
await zoomPage.close();
await browser.close();

await writeFile(path.join(evidenceDir, 'viewport-checks.json'), `${JSON.stringify({ source, browser: 'Chromium via @playwright/test', checks, notRun: ['physical devices', 'soft keyboard', 'screen reader', 'true 200% browser zoom'] }, null, 2)}\n`, 'utf8');
if (checks.some(check => check.overflow || check.errors.length > 0)) process.exitCode = 1;
