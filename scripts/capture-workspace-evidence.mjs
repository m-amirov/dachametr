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
const ignoredLocalCapture = line => line.includes('artifacts/baseline-pr11/');
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

await capture({ name: 'desktop-1440x900.png', url: '/artifacts/dachametr-workspace/index.html', viewport: { width: 1440, height: 900 }, state: 'desktop-editor' });
await capture({ name: 'desktop-material-1440x900.png', url: '/artifacts/dachametr-workspace/index.html', viewport: { width: 1440, height: 900 }, state: 'desktop-selected-material', prepare: async page => {
  await page.locator('[data-action="select-zone"][data-zone-id="path"]').click();
  await page.getByRole('button', { name: 'Настроить Песок карьерный' }).click();
} });
await capture({ name: 'mobile-390x844.png', url: '/artifacts/dachametr-workspace/index.html', viewport: { width: 390, height: 844 }, state: 'mobile-editor' });
await capture({ name: 'mobile-bom-390x844.png', url: '/artifacts/dachametr-workspace/index.html', viewport: { width: 390, height: 844 }, state: 'mobile-bom', prepare: async page => {
  await page.getByRole('tab', { name: 'Ведомость' }).click();
} });
await capture({ name: 'design-board-1440x900.png', url: '/artifacts/dachametr-workspace/design-board.html', viewport: { width: 1440, height: 900 }, state: 'design-board' });

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
if (checks.some(check => check.horizontalOverflow || check.consoleErrors.length || check.requestFailures.length)) process.exitCode = 1;
console.log(JSON.stringify(manifest, null, 2));
