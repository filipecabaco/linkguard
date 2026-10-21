// Renders scripts/og-image.html to docs/og-image.png at 1200×630, the size link previews expect.
// Uses Playwright's Chromium (one-time: npx playwright install chromium). Usage: npm run og-image
import { chromium } from "@playwright/test";

const root = new URL("..", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(`file://${root}scripts/og-image.html`);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${root}docs/og-image.png` });
await browser.close();
console.log("wrote docs/og-image.png");
