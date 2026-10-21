const { test, expect, PAGE, PHISH, open, blockedPage } = require("./fixtures");

test("opens the welcome page on first install", async ({ context, extensionId }) => {
  await expect.poll(() => context.pages().map(p => p.url())).toContain(`chrome-extension://${extensionId}/welcome.html`);
});

test("marks risky links on a page and leaves safe ones alone", async ({ page, extensionId }) => {
  await page.goto(PAGE);
  await expect(page.locator("#bad")).toHaveClass(/lg-dangerous/);
  await expect(page.locator("#sus")).toHaveClass(/lg-suspicious/);
  await expect(page.locator("#safe")).not.toHaveClass(/lg-flag/);
  await expect(page.locator("#bad .lg-mark")).toHaveText("!");
});

test("asks before opening a dangerous link, and Escape keeps you on the page", async ({ page, extensionId }) => {
  await page.goto(PAGE);
  await expect(page.locator("#bad")).toHaveClass(/lg-dangerous/);
  await page.locator("#bad").click();
  await expect(page.locator("linkguard-warning")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("linkguard-warning")).toHaveCount(0);
  expect(page.url()).toBe(PAGE);
});

test("stops a dangerous address opened directly", async ({ page, extensionId }) => {
  await open(page, PHISH);
  await blockedPage(page, extensionId);
  await expect(page.locator("h1")).toHaveText("This link is pretending to be PayPal");
  await expect(page.locator("#reasons li")).toHaveCount(3);
  await expect(page.locator("#url mark")).toHaveText("paypa1-account-verify.xyz");
});

test("Open anyway lets the page through once", async ({ page, extensionId }) => {
  await open(page, PHISH);
  await blockedPage(page, extensionId);
  await page.getByRole("button", { name: "Open anyway" }).click();
  await page.waitForURL(PHISH);
  await expect(page.locator("h1")).toHaveText("Fake PayPal");
});

test("trusting a site stops future blocks", async ({ page, extensionId }) => {
  await open(page, PHISH);
  await blockedPage(page, extensionId);
  await page.getByRole("button", { name: "I trust this site" }).click();
  await page.getByRole("button", { name: "Yes, always allow it" }).click();
  await page.waitForURL(PHISH);
  await open(page, PAGE);
  await open(page, PHISH);
  await expect(page.locator("h1")).toHaveText("Fake PayPal");
});

test("safe pages open normally", async ({ page }) => {
  await page.goto(PAGE);
  expect(page.url()).toBe(PAGE);
});
