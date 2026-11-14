import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.EVIDENCE_BASE_URL ?? 'http://127.0.0.1:4173';
const evidenceDir = path.resolve(process.env.EVIDENCE_DIR ?? 'artifacts/ui-evidence/local');
const widths = [960, 961, 1024, 1100, 1200, 1280, 1440, 320, 390, 195];

async function readHeaderGeometry(page) {
  return page.evaluate(() => {
    const intersects = (first, second) => Boolean(
      first && second
      && first.left < second.right
      && first.right > second.left
      && first.top < second.bottom
      && first.bottom > second.top,
    );
    const readRect = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const readRenderedTextRect = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const range = document.createRange();
      range.selectNodeContents(element);
      const rect = range.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const heading = readRect('.site-header h1');
    const headingText = readRenderedTextRect('.site-header h1');
    const description = readRect('.site-intro');
    const state = readRect('.session-note');
    return {
      viewport: { width: innerWidth, height: innerHeight },
      headerColumns: getComputedStyle(document.querySelector('.site-header')).gridTemplateColumns,
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
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
}

await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch();
const checks = [];
for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: width <= 390 ? 844 : 900 }, deviceScaleFactor: 1 });
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  checks.push({ width, ...(await readHeaderGeometry(page)) });
  await page.close();
}
await browser.close();

await writeFile(path.join(evidenceDir, 'header-geometry.json'), `${JSON.stringify(checks, null, 2)}\n`, 'utf8');
if (checks.some(check => Object.values(check.overlaps).some(Boolean) || check.scrollWidth > check.clientWidth)) {
  process.exitCode = 1;
}
