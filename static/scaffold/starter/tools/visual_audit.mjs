#!/usr/bin/env node
/**
 * Browser screenshot baseline, not a full visual regression framework.
 * Setup: npm install -D playwright && npx playwright install chromium
 * Usage: node tools/visual_audit.mjs --url http://localhost:5173 --output visual-audit
 */
import fs from 'node:fs/promises';
import path from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const url = arg('url', 'http://localhost:5173');
const output = path.resolve(arg('output', 'visual-audit'));
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright missing. In the project run: npm install -D playwright && npx playwright install chromium');
  process.exit(2);
}
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const evidence = { url, screenshots: [], errors: [], checks: [] };
try {
  for (const [name, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', err => evidence.errors.push(`${name}: ${err.message}`));
    page.on('console', msg => { if (msg.type() === 'error') evidence.errors.push(`${name} console: ${msg.text()}`); });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(600);
      const filepath = path.join(output, `${name}-initial.png`);
      await page.screenshot({ path: filepath, fullPage: true, animations: 'disabled' });
      evidence.screenshots.push(filepath);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        title: document.title,
      }));
      evidence.checks.push({ name, responsiveOverflow: metrics.scrollWidth > metrics.clientWidth, title: metrics.title });
      const sceneButtons = page.locator('[data-demo-scene]');
      if (await sceneButtons.count() > 1) {
        await sceneButtons.nth(1).click();
        const actionFile = path.join(output, `${name}-interaction.png`);
        await page.screenshot({ path: actionFile, fullPage: true, animations: 'disabled' });
        evidence.screenshots.push(actionFile);
        evidence.checks.push({ name, sceneClick: true });
      }
    } catch (error) {
      evidence.errors.push(`${name}: ${error.message}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
if (evidence.errors.length || evidence.checks.some(x => x.responsiveOverflow)) process.exitCode = 1;
