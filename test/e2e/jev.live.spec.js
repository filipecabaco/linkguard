// Live smoke test against the real Jev API. Skipped unless a key is provided:
//   TYPESAFE_API_KEY=... npm run test:e2e -- jev.live
const { test, expect } = require("./fixtures");

const provider = "typesafe";
const key = process.env.TYPESAFE_API_KEY;

const CASES = [
  { url: "http://paypa1-account-verify.xyz/login", text: "www.paypal.com", expect: "dangerous" },
  { url: "https://free-iphone-winner.top/claim-now", text: "You won an iPhone!", expect: "dangerous" },
  { url: "https://en.wikipedia.org/wiki/Phishing", text: "Phishing on Wikipedia", expect: "safe" },
  { url: "https://github.com/microsoft/playwright", text: "Playwright on GitHub", expect: "safe" }
];

test.skip(!key, "set TYPESAFE_API_KEY to run");

test(`Jev judgments through ${provider} from the extension's own background`, async ({ context, extensionId }) => {
  const sw = context.serviceWorkers()[0];
  await sw.evaluate(async ([k, p]) => { await chrome.storage.local.set({ jevKey: k, jevProvider: p }); await chrome.storage.sync.set({ useJev: true }); }, [key, provider]);
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  const send = msg => page.evaluate(m => new Promise(r => chrome.runtime.sendMessage(m, r)), msg);
  const health = await send({ type: "jevTest" });
  console.log("jevTest:", JSON.stringify(health));
  expect(health.ok, health.error).toBe(true);

  for (const c of CASES) {
    const j = await send({ type: "jevCheck", url: c.url, text: c.text, pageHost: "news.example", heuristic: { reasons: [] } });
    const level = j.score >= 60 ? "dangerous" : j.score >= 30 ? "suspicious" : "safe";
    console.log(`${level.padEnd(10)} ${String(j.score).padStart(3)} ${j.category} (${Math.round(j.categoryProb * 100)}%) harmful=${(j.harmful ?? 0).toFixed(2)}  ${c.url}\n    ${(j.reasons || []).join(" | ") || j.error || ""}`);
    expect(j.error).toBeUndefined();
    expect.soft(level === "safe", `${c.url} judged ${level}, expected ${c.expect}`).toBe(c.expect === "safe");
  }
});

test("the welcome page turns smart checks on with a pasted TypeSafe key", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/welcome.html#smart`);
  await page.getByLabel("TypeSafe key").fill(key);
  await page.getByRole("button", { name: "Turn on smart checks" }).click();
  await expect(page.locator("#status")).toHaveText("Connected. Smart checks are on.", { timeout: 15_000 });
  await expect(page.locator("#s3")).toHaveClass(/done/);
});

test("a wrong key is explained in plain words and leaves smart checks off", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/welcome.html#smart`);
  await page.getByLabel("TypeSafe key").fill("apikey_not_a_real_key");
  await page.getByRole("button", { name: "Turn on smart checks" }).click();
  await expect(page.locator("#status")).toHaveText(/didn't accept that key/, { timeout: 15_000 });
  const sw = context.serviceWorkers()[0];
  expect(await sw.evaluate(() => chrome.storage.sync.get({ useJev: false }).then(s => s.useJev))).toBe(false);
});
