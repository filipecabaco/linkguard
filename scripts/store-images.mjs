// Store listing images, captured from the real extension in Chromium and framed with a caption.
//   npm run store-images   → store/images/  (needs: npx playwright install chromium)
// Screenshots are 1280×800 (Chrome Web Store, Edge, AMO). Also a 440×280 small promo tile, a 1400×560 marquee
// and a 300×300 logo. Nothing touches the network: the demo page and the fake scam site are served in-process.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url).pathname;
const OUT = `${root}store/images`;
const EXT = `${root}dist/chrome`;
const PAGE = "https://forum.riverside.example/t/parcel-texts";
const PHISH = "http://paypa1-account-verify.xyz/login";

// A neighbourhood forum thread: the kind of page scam links turn up on.
const DEMO = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Got a text about a parcel? · Riverside Neighbours</title>
<style>
  body { margin: 0; background: #f3f4f6; color: #1f2937; font: 17px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { background: #2f5d50; color: #fff; padding: 14px 40px; font-weight: 700; font-size: 19px; }
  header span { font-weight: 400; opacity: .8; margin-left: 12px; font-size: 15px; }
  main { max-width: 780px; margin: 0 auto; padding: 28px 24px; }
  h1 { font-size: 27px; margin: 0 0 18px; }
  .post { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; margin-bottom: 14px; }
  .who { font-size: 15px; color: #6b7280; margin-bottom: 4px; } .who b { color: #1f2937; }
  .post p { margin: 4px 0; }
  a { color: #1d4ed8; }
</style></head><body>
<header>Riverside Neighbours <span>Community board</span></header>
<main>
  <h1>Got a text about a parcel? Read this first</h1>
  <div class="post"><div class="who"><b>Maria</b> · 2 hours ago</div>
    <p>I got an email saying my account is limited and to log in at <a id="bad" href="${PHISH}">www.paypal.com</a> to fix it. Is this real?</p></div>
  <div class="post"><div class="who"><b>Tom</b> · 1 hour ago</div>
    <p>Same here, plus one promising a <a id="sus" href="https://bit.ly/free-gift-card">free gift card</a> if I fill in a survey.</p></div>
  <div class="post"><div class="who"><b>Building office</b> · 1 hour ago</div>
    <p>Please don't open the <a href="https://example.com/invoice.pdf.exe">invoice attachment</a> going around. Here's a good explainer on <a href="https://en.wikipedia.org/wiki/Phishing">how phishing works</a>.</p></div>
  <div class="post"><div class="who"><b>Priya</b> · 40 minutes ago</div>
    <p>Real deliveries can be tracked on the <a href="https://www.royalmail.com/track-your-item">Royal Mail site</a>. Type the address yourself.</p></div>
</main></body></html>`;

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const font = `url(data:font/woff2;base64,${(await readFile(`${root}fonts/archivo-latin.woff2`)).toString("base64")})`;
const BASE = `
  @font-face { font-family: "LG Archivo"; src: ${font} format("woff2"); font-weight: 100 900; font-stretch: 62% 125%; }
  * { box-sizing: border-box; }
  html, body { margin: 0; overflow: hidden; }
  body { background: #E9E4DA; color: #1C2238; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  .display { font-family: "LG Archivo", "Arial Narrow", sans-serif; font-weight: 800; font-stretch: 72%; letter-spacing: -.015em; line-height: .95; }
  .brand { display: flex; align-items: center; gap: 12px; font: 800 24px/1 "LG Archivo", sans-serif; font-stretch: 80%; letter-spacing: .05em; text-transform: uppercase; }
  .brand svg { width: 26px; height: 30px; }
  .stamp { display: inline-block; border: 6px double #E2382B; color: #C1261B; background: #F6F5F1; border-radius: 8px; transform: rotate(-9deg);
    padding: .16em .42em .08em; font: 900 48px/1 "LG Archivo", sans-serif; font-stretch: 68%; letter-spacing: .06em; text-transform: uppercase; }`;
const LOGO = `<svg viewBox="0 0 30 34" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M15 2 3 6.5v9.2C3 24 8.6 29.6 15 32c6.4-2.4 12-8 12-16.3V6.5L15 2Z"/><path d="M9 17.5l4 4 8-9"/></svg>`;

// One screenshot: caption on top, the capture below in a plain window frame.
function frame(title, sub, png, overlay = "") {
  return `<!doctype html><html><head><style>${BASE}
  body { width: 1280px; height: 800px; padding: 44px 80px 0; }
  .top { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; height: 128px; }
  h1 { margin: 0; font-size: 58px; max-width: 24ch; text-wrap: balance; }
  p { margin: 10px 0 0; font-size: 22px; color: #4A5068; }
  .brand { flex: none; padding-bottom: 6px; }
  .win { position: relative; margin-top: 28px; width: 1120px; height: 600px; border-radius: 10px 10px 0 0; overflow: hidden; background: #fff;
    box-shadow: 0 18px 40px #4A382633; border: 1px solid #1C223833; border-bottom: 0; }
  .bar { height: 30px; background: #F6F5F1; border-bottom: 1px solid #1C223822; display: flex; align-items: center; gap: 7px; padding: 0 12px; }
  .bar i { width: 11px; height: 11px; border-radius: 50%; background: #1C223833; }
  .shot { display: block; width: 1120px; }
  </style></head><body>
  <div class="top"><div><h1 class="display">${esc(title)}</h1><p>${esc(sub)}</p></div><div class="brand">${LOGO}LinkGuard</div></div>
  <div class="win"><div class="bar"><i></i><i></i><i></i></div><img class="shot" src="data:image/png;base64,${png.toString("base64")}">${overlay}</div>
  </body></html>`;
}

function promo(w, h, { title, size, stamp, brand }) {
  return `<!doctype html><html><head><style>${BASE}
  body { width: ${w}px; height: ${h}px; background: #F6F5F1; display: flex; flex-direction: column; }
  .band { flex: none; height: ${Math.round(h * .2)}px; background: #B48A5C; display: flex; align-items: center; justify-content: center; }
  .brand { font-size: ${brand}px; gap: ${brand / 2}px; } .brand svg { width: ${brand * 1.1}px; height: ${brand * 1.25}px; }
  main { flex: 1; display: flex; align-items: center; justify-content: center; gap: ${size * .4}px; }
  h1 { margin: 0; font-size: ${size}px; text-align: center; }
  .stamp { font-size: ${stamp}px; border-width: ${Math.max(4, stamp / 8)}px; }
  </style></head><body><div class="band"><div class="brand">${LOGO}LinkGuard</div></div>
  <main><h1 class="display">${title}</h1>${stamp ? `<div class="stamp">Not safe</div>` : ""}</main></body></html>`;
}

execFileSync("node", [`${root}scripts/build.mjs`, "chrome"], { stdio: "inherit" });
await mkdir(OUT, { recursive: true });

const context = await chromium.launchPersistentContext("", {
  channel: "chromium", colorScheme: "light", viewport: { width: 1120, height: 570 }, deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
});
await context.route(`${PAGE}**`, r => r.fulfill({ contentType: "text/html", body: DEMO }));
await context.route("http://paypa1-account-verify.xyz/**", r => r.fulfill({ contentType: "text/html", body: "<h1>Fake PayPal</h1>" }));
const sw = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
const id = sw.url().split("/")[2];
// The welcome tab opens on install; it is also screenshot 5.
let welcome;
while (!(welcome = context.pages().find(p => p.url().endsWith("/welcome.html")))) await new Promise(r => setTimeout(r, 100));

// Captures at 2× so the framed, slightly scaled-down screenshots stay sharp.
const shot = page => page.screenshot({ scale: "device" });
const page = await context.newPage();
await page.goto(PAGE);
await page.locator("#bad.lg-dangerous").waitFor();
await page.locator("#sus.lg-suspicious").waitFor();
const marked = await shot(page);

await page.locator("#bad").click();
await page.locator("linkguard-warning").waitFor({ state: "attached" });
await page.waitForTimeout(400);
const warning = await shot(page);
await page.keyboard.press("Escape");

// The real popup, asked about the demo tab: only its "which tab is active" lookup is pointed at the demo page.
const [{ id: tabId }] = await sw.evaluate(url => chrome.tabs.query({ url }), PAGE);
const popup = await context.newPage();
await popup.addInitScript(([tid, url]) => {
  const query = chrome.tabs.query.bind(chrome.tabs);
  chrome.tabs.query = (q, cb) => q.active ? cb([{ id: tid, url }]) : query(q, cb);
}, [tabId, PAGE]);
await popup.setViewportSize({ width: 360, height: 560 });
await popup.goto(`chrome-extension://${id}/popup.html`);
await popup.waitForTimeout(800);
const popupPng = await popup.locator("body").screenshot({ scale: "device" });
const popupH = await popup.evaluate(() => document.body.getBoundingClientRect().height);
await popup.close();

// Full pages are captured wider and shown scaled down, so the whole stop page fits the frame.
const stop = await context.newPage();
await stop.setViewportSize({ width: 1280, height: 650 });
await stop.goto(PHISH).catch(() => {});
while (!stop.url().includes("/blocked.html")) await stop.waitForTimeout(100);
await stop.waitForLoadState();
await stop.waitForTimeout(600);
const blocked = await shot(stop);

await welcome.setViewportSize({ width: 1280, height: 650 });
await welcome.bringToFront();
await welcome.waitForTimeout(400);
const welcomePng = await shot(welcome);

const popupOverlay = `<img src="data:image/png;base64,${popupPng.toString("base64")}" style="position:absolute; right:24px; top:30px; width:360px; height:${popupH}px;
  border-radius: 0 0 8px 8px; box-shadow: 0 14px 34px #1C223855; border: 1px solid #1C223833;">`;

const shots = [
  ["1-marks", "Risky links get marked before you click", "Yellow means look twice. Red means not safe.", marked],
  ["2-warning", "It asks before you open a dangerous link", "The reasons are in plain words, and you decide.", warning],
  ["3-stop-page", "Stops dangerous sites, even typed ones", "Going back to safety is the big button.", blocked],
  ["4-popup", "See every risky link on the page", "One click on the toolbar button.", marked, popupOverlay],
  ["5-welcome", "Works straight away, nothing to set up", "Checks run on your device. Nothing is sent anywhere unless you turn on smart checks.", welcomePng]
];

const render = await context.newPage();
async function save(name, html, w, h) {
  await render.setViewportSize({ width: w, height: h });
  await render.setContent(html);
  await render.evaluate(() => document.fonts.ready);
  await render.screenshot({ path: `${OUT}/${name}.png`, scale: "css" });
  console.log(`wrote store/images/${name}.png`);
}
for (const [name, title, sub, png, overlay] of shots) await save(`screenshot-${name}`, frame(title, sub, png, overlay), 1280, 800);
await save("promo-small-440x280", promo(440, 280, { title: "Is this<br>link safe?", size: 62, stamp: 0, brand: 18 }), 440, 280);
await save("promo-marquee-1400x560", promo(1400, 560, { title: "Is this<br>link safe?", size: 150, stamp: 64, brand: 34 }), 1400, 560);

// Square logo for Edge (300×300 recommended): the toolbar icon, scaled up from its SVG.
const svg = await readFile(`${root}icons/icon.svg`, "utf8");
await save("logo-300x300", `<!doctype html><style>html,body{margin:0;width:300px;height:300px;overflow:hidden}svg{width:300px;height:300px;display:block}</style>${svg}`, 300, 300);

await context.close();
