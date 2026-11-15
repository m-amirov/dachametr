import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const baseURL = process.env.EVIDENCE_BASE_URL ?? 'http://127.0.0.1:4173';
const evidenceDir = path.resolve(process.env.EVIDENCE_DIR ?? 'artifacts/dachametr-workspace/evidence/latest');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sourceSha = git('rev-parse', 'HEAD');
const dirty = git('status', '--porcelain=v1', '--untracked-files=all');
const ignoredLocalCapture = line => line.includes('artifacts/baseline-pr11/') || line.includes('artifacts/dachametr-workspace/evidence/latest/');
const sourceDirty = dirty.split(/\r?\n/).filter(Boolean).filter(line => !ignoredLocalCapture(line));
if (sourceDirty.length) throw new Error(`Capture requires a clean source checkout before writing evidence:\n${sourceDirty.join('\n')}`);

const sourceFiles = ['src/domain/plot.ts', 'src/domain/exact.ts', 'artifacts/dachametr-workspace/index.html', 'artifacts/dachametr-workspace/app.js', 'artifacts/dachametr-workspace/styles.css', 'artifacts/dachametr-workspace/scenario.json'];
const sourceChecksums = [];
const sourceDigest = createHash('sha256');
for (const file of sourceFiles) {
  const bytes = await readFile(path.join(root, file));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  sourceChecksums.push({ file, sha256 });
  sourceDigest.update(file + '\0');
  sourceDigest.update(bytes);
  sourceDigest.update('\0');
}

await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch();
const browserVersion = browser.version();
const checks = [];
const geometryChecks = [];

async function capture({ name, url, viewport, state, prepare }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', request => errors.push(`request: ${request.url()} ${request.failure()?.errorText ?? ''}`));
  await page.goto(`${baseURL}${url}`, { waitUntil: 'networkidle' });
  if (prepare) await prepare(page);
  await page.waitForTimeout(100);
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
  const file = path.join(evidenceDir, name);
  await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });
  const bytes = await readFile(file);
  checks.push({
    state,
    url,
    viewport: `${viewport.width}x${viewport.height}`,
    dpr: 1,
    file: path.relative(root, file).replaceAll('\\', '/'),
    pixels: `${viewport.width}x${viewport.height}`,
    bytes: bytes.length,
    pngSha256: createHash('sha256').update(bytes).digest('hex'),
    horizontalOverflow: geometry.scrollWidth > geometry.clientWidth,
    geometry,
    consoleErrors: errors.filter(error => error.startsWith('console:')),
    requestFailures: errors.filter(error => error.startsWith('request:')),
  });
  await page.close();
}

async function inspectZoneGeometry(width, zoneId) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(`${baseURL}/artifacts/dachametr-workspace/index.html`, { waitUntil: 'networkidle' });
  if (width <= 820) await page.getByRole('tab', { name: 'Зоны' }).click();
  await page.getByTestId(`zone-row-${zoneId}`).click();
  const geometry = await page.getByTestId('zone-rectangle').evaluate(element => {
    const rect = element.getBoundingClientRect();
    const canvas = element.closest('.figure-canvas').getBoundingClientRect();
    const visualGrid = element.closest('.zone-visual-grid').getBoundingClientRect();
    const section = element.closest('.zone-visual-grid').querySelector('.section-figure').getBoundingClientRect();
    const measureRects = [...element.closest('.figure-canvas').querySelectorAll('.measure-label')].map(label => {
      const labelRect = label.getBoundingClientRect();
      return { left: labelRect.left, right: labelRect.right, top: labelRect.top, bottom: labelRect.bottom };
    });
    const inside = (inner, outer) => inner.left >= outer.left - 0.5 && inner.right <= outer.right + 0.5 && inner.top >= outer.top - 0.5 && inner.bottom <= outer.bottom + 0.5;
    const sectionOverlapsRectangle = rect.left < section.right && rect.right > section.left && rect.top < section.bottom && rect.bottom > section.top;
    return {
      rectangle: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
      canvas: { left: canvas.left, right: canvas.right, top: canvas.top, bottom: canvas.bottom, width: canvas.width, height: canvas.height },
      visualGrid: { top: visualGrid.top, bottom: visualGrid.bottom },
      section: { left: section.left, right: section.right, top: section.top, bottom: section.bottom },
      sectionOverlapsRectangle,
      measureRects,
      rectangleInsideCanvas: inside(rect, canvas),
      rectangleInsideVisualGrid: rect.bottom <= visualGrid.bottom + 0.5,
      sectionInsideVisualGrid: section.bottom <= visualGrid.bottom + 0.5,
      measureLabelsInsideCanvas: measureRects.every(measure => inside(measure, canvas)),
    };
  });
  geometryChecks.push({
    viewport: `${width}x900`,
    width,
    zoneId,
    ...geometry,
    aspectRatio: geometry.rectangle.width / geometry.rectangle.height,
    pass: geometry.rectangleInsideCanvas && geometry.rectangleInsideVisualGrid && geometry.sectionInsideVisualGrid && geometry.measureLabelsInsideCanvas && !geometry.sectionOverlapsRectangle,
  });
  await page.close();
}

await capture({ name: 'desktop-1440x900.png', url: '/artifacts/dachametr-workspace/index.html', viewport: { width: 1440, height: 900 }, state: 'desktop-editor' });
await capture({ name: 'desktop-material-1440x900.png', url: '/artifacts/dachametr-workspace/index.html', viewport: { width: 1440, height: 900 }, state: 'desktop-selected-material', prepare: async page => {
  await page.locator('[data-action="select-zone"][data-zone-id="path"]').click();
  await page.getByRole('button', { name: 'Настроить Песок карьерный' }).click();
} });
await capture({ name: 'mobile-390x844.png', url: '/artifacts/dachametr-workspace/index.html', viewport: { width: 390, height: 844 }, state: 'mobile-editor' });
await capture({ name: 'mobile-zones-390x844.png', url: '/artifacts/dachametr-workspace/index.html', viewport: { width: 390, height: 844 }, state: 'mobile-zones', prepare: async page => {
  await page.getByRole('tab', { name: 'Зоны' }).click();
} });
await capture({ name: 'mobile-path-390x844.png', url: '/artifacts/dachametr-workspace/index.html', viewport: { width: 390, height: 844 }, state: 'mobile-selected-path', prepare: async page => {
  await page.getByRole('tab', { name: 'Зоны' }).click();
  await page.getByTestId('zone-row-path').click();
} });
await capture({ name: 'mobile-bom-390x844.png', url: '/artifacts/dachametr-workspace/index.html', viewport: { width: 390, height: 844 }, state: 'mobile-bom', prepare: async page => {
  await page.getByRole('tab', { name: 'Ведомость' }).click();
} });
await capture({ name: 'tablet-path-768x900.png', url: '/artifacts/dachametr-workspace/index.html', viewport: { width: 768, height: 900 }, state: 'tablet-selected-path', prepare: async page => {
  await page.getByRole('tab', { name: 'Зоны' }).click();
  await page.getByTestId('zone-row-path').click();
} });
await capture({ name: 'design-board-1440x900.png', url: '/artifacts/dachametr-workspace/design-board.html', viewport: { width: 1440, height: 900 }, state: 'design-board' });

for (const width of [320, 390, 768, 1024, 1440]) {
  for (const zoneId of ['bed', 'path']) await inspectZoneGeometry(width, zoneId);
}

await browser.close();
const manifest = {
  captureTool: '@playwright/test 1.65.0',
  browser: 'Chromium',
  browserVersion,
  baseURL,
  sourceSha,
  dirtyBeforeCapture: false,
  sourceDigestSha256: sourceDigest.digest('hex'),
  sourceFiles: sourceChecksums,
  checks,
  geometryChecks,
  gates: {
    physicalMobileDevice: 'BLOCKED',
    realSoftKeyboard: 'NOT RUN',
    assistiveTechnology: 'NOT RUN',
    productionFontRendering: 'NOT RUN',
    workingAppIntegration: 'NOT RUN by scope',
    openDesignCloud: 'NOT RUN',
  },
};
await writeFile(path.join(evidenceDir, 'viewport-checks.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
if (checks.some(check => check.horizontalOverflow || check.consoleErrors.length || check.requestFailures.length) || geometryChecks.some(check => !check.pass)) process.exitCode = 1;
console.log(JSON.stringify(manifest, null, 2));
