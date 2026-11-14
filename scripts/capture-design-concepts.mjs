import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.CONCEPTS_BASE_URL ?? 'http://127.0.0.1:4173/artifacts/design-concepts/index.html';
const outputDir = path.resolve(process.env.CONCEPTS_EVIDENCE_DIR ?? 'artifacts/design-concepts/evidence-90bb578');
const concepts = ['a', 'b', 'c'];
const states = ['initial', 'editing', 'error', 'result'];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();
const checks = [];

for (const concept of concepts) {
  for (const state of states) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('console', message => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });
      page.on('requestfailed', request => errors.push(`request: ${request.url()} ${request.failure()?.errorText ?? ''}`));
      await page.goto(`${baseURL}?concept=${concept}&state=${state}`);
      await page.locator('#app').waitFor();
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        title: document.title,
        concept: document.body.dataset.concept,
        state: document.body.dataset.state,
      }));
      const filename = `${concept}-${state}-${viewport.name}.png`;
      await page.screenshot({ path: path.join(outputDir, filename), fullPage: true, timeout: 120_000 });
      checks.push({ concept, state, viewport: viewport.name, ...metrics, errors });
      await page.close();
    }
  }
}

await browser.close();
await writeFile(path.join(outputDir, 'checks.json'), `${JSON.stringify(checks, null, 2)}\n`, 'utf8');
if (checks.some(check => check.overflow || check.errors.length > 0)) process.exitCode = 1;
