const { test: base, expect, chromium } = require("@playwright/test");
const path = require("node:path");

const EXT = path.join(__dirname, "../../dist/chrome");
const PAGE = "https://news.looktwice.test/";
const PHISH = "http://paypa1-account-verify.xyz/login";

const HTML = `<!doctype html><title>News</title>
<p><a id="safe" href="https://example.com/about">About us</a></p>
<p><a id="sus" href="https://bit.ly/free-gift-card">Claim your gift</a></p>
<p><a id="bad" href="${PHISH}">www.paypal.com</a></p>`;

const test = base.extend({
  context: async ({}, use) => {
    // channel "chromium" is the build that still allows loading unpacked extensions, headless included.
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
    });
    // No real network: the test page and the fake phishing page are served here.
    await context.route(`${PAGE}**`, r => r.fulfill({ contentType: "text/html", body: HTML }));
    await context.route("http://paypa1-account-verify.xyz/**", r => r.fulfill({ contentType: "text/html", body: "<h1>Fake PayPal</h1>" }));
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const sw = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
    const id = sw.url().split("/")[2];
    // The welcome tab opens from onInstalled, so once it exists the worker has registered all its listeners.
    // Navigating before that races the install itself, which no real user can hit.
    await expect.poll(() => context.pages().some(p => p.url() === `chrome-extension://${id}/welcome.html`)).toBe(true);
    await use(id);
  }
});

// page.goto rejects when the extension replaces the navigation; that's the behaviour under test.
async function open(page, url) {
  await page.goto(url).catch(() => {});
}

module.exports = { test, expect, PAGE, PHISH, open };

// The block aborts the original navigation, which waitForURL reports as an error, so poll the URL instead.
async function blockedPage(page, extensionId) {
  await expect.poll(() => page.url()).toContain(`chrome-extension://${extensionId}/blocked.html`);
  await page.waitForLoadState();
}

module.exports.blockedPage = blockedPage;
