#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${CAPTURE_URL:?CAPTURE_URL must be set}"
: "${CAPTURE_DIR:?CAPTURE_DIR must be set}"
/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
/usr/bin/time -p test -n "$CAPTURE_URL"
/usr/bin/time -p node --input-type=module <<'NODEJS'
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const url = process.env.CAPTURE_URL;
const output = process.env.CAPTURE_DIR;
if (!url || !output) { console.error('Set CAPTURE_URL and CAPTURE_DIR.'); process.exit(1); }
mkdirSync(output, { recursive: true });
const runtime = join(process.env.HOME, '.local/share/omgithub-playwright');
const require = createRequire(join(runtime, 'package.json'));
const { chromium } = require('playwright');
const configFile = join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json');
let config;
try { config = JSON.parse(readFileSync(configFile, 'utf8')); }
catch (error) { console.error('Failed to read playwright config: ' + error.message); process.exit(1); }
if (process.platform === 'linux') {
  try { process.env.DISPLAY ||= ':' + readFileSync(join(runtime, 'display'), 'utf8').trim(); }
  catch (error) { console.error('Failed to read display: ' + error.message); process.exit(75); }
}
const transient = (error) => { throw Object.assign(error instanceof Error ? error : new Error(String(error)), { exitCode: 75 }); };
let browser;
try {
  browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(transient);
  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } }).catch(transient);
    try {
      page.setDefaultTimeout(30000);
      page.on('pageerror', (error) => console.error(error.message));
      const response = await page.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(transient);
      const status = response?.status();
      if (!response || !response.ok()) {
        const code = !response || [408, 429, 500, 502, 503, 504].includes(status) ? 75 : 1;
        throw Object.assign(new Error(`HTTP ${status ?? 'no-response'} loading preview`), { exitCode: code });
      }
      try {
        await page.locator('body').waitFor({ state: 'visible' });
      } catch (error) {
        throw Object.assign(new Error('Rendered content not visible: body missing'), { exitCode: 1 });
      }
      try {
        await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 10000 });
      } catch { /* fonts may already be loaded; continue */ }
      await page.waitForTimeout(1000);
      const shotPath = join(output, `final-${name}.png`);
      await page.screenshot({ path: shotPath, timeout: 30000 }).catch((error) => {
        if (error.name === 'TimeoutError' || !browser.isConnected()) transient(error);
        throw error;
      });
      console.log(`Captured ${shotPath} (${width}x${height})`);
    } finally {
      await page.close().catch((e) => console.error(e.message));
    }
  }
} catch (error) {
  console.error(error);
  process.exit(error.exitCode || 1);
} finally {
  await browser?.close().catch((error) => { console.error(error); process.exitCode ||= 75; });
}
NODEJS
/usr/bin/time -p test -f "$CAPTURE_DIR/final-desktop.png"
/usr/bin/time -p test -f "$CAPTURE_DIR/final-mobile.png"
