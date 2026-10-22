# LinkGuard

A browser extension for people who shouldn't have to think about links. It checks every link on a page and marks the risky ones. It also stops dangerous sites before they open, including addresses typed into the address bar. Warnings say what's wrong in plain words, and the person decides.

Works in Chrome, Edge, Brave, Opera and Vivaldi, Firefox (desktop and Android), and Safari (macOS and iOS).

## What people see

- **On a page:** risky links get marked. Yellow with a dashed outline and "?" means *look twice*. Red with a double outline and "!" means *not safe*. Clicking either shows a short warning first.
- **In the address bar:** a dangerous address opens a full-page stop instead of the site. "Go back to safety" is the big button; "Open anyway" and "I trust this site" are there but quiet.
- **Toolbar:** the badge counts risky links; the popup lists them.
- **First run:** a welcome page shows what the marks mean, how to pin the extension, and (optionally) walks through turning on smart checks.

Design notes are in [DESIGN.md](DESIGN.md) and product notes in [PRODUCT.md](PRODUCT.md).

## How it decides

1. **Built-in checks run on the device, instantly.** They look for look-alike brand names (`paypa1`, `paypal.com.evil.ru`), link text showing one address while going to another, raw IP addresses, look-alike letters from other alphabets, scam wording, program downloads and disguised file types, hidden redirects, shortened links, and `javascript:` links. Nothing leaves the browser.
2. **Smart checks (optional): Jev by TypeSafe.** Jev judges links that are new or tricky. It can only raise a warning, never clear one the built-in checks call dangerous, unless the person allows it to remove mild false alarms. Billed by TypeSafe to the person's own account.
3. **Google Safe Browsing (optional):** needs the person's own API key.

Address-bar blocking uses only instant signals: built-in checks, plus Safe Browsing and Jev results already saved for that address. When smart checks are on, a page that passed is checked again once it has opened. If it turns out dangerous, the tab is replaced by the stop page.

**How blocking differs by browser:**
- **Firefox:** blocks *before* the request is sent (blocking `webRequest`).
- **Chromium (Chrome, Edge and the rest):** Manifest V3 can't pause a page load. LinkGuard replaces the tab as the navigation starts, and again when the page commits, which catches pages Chrome loaded early in the background. The page never gets used, but the request may already have reached the server.

## Smart-check setup for non-technical people

The welcome page walks through it:

1. **Open the TypeSafe console** (`console.typesafe.ai/keys`) in a new tab and sign in. TypeSafe is in early access; people without an account are pointed to request one.
2. **Create a key** named LinkGuard and copy it.
3. **Paste it** and press *Turn on smart checks*. LinkGuard runs one real check straight away. A key that doesn't work gets a plain explanation and leaves smart checks off.

Calls go straight from the extension's background to `api.typesafe.ai`, with the model pinned to `jev-1.14.0`. TypeSafe's API rejects browser origins under CORS. The extension's host permission exempts its background requests, which is why Firefox needs site access granted before a key can be tested. The setup asks for it if it's missing.

The TypeSafe console can't be shown inside the extension: it refuses to be framed (`X-Frame-Options: SAMEORIGIN`). That's also the safer design, since signing in happens in a real tab where people can see the address bar.

Keys live in `storage.local` and are only used by the background script; web pages never see them. Before anything is sent, people get a plain disclosure. On Firefox they also get the browser's own data-consent prompt (`data_collection_permissions`).

## Develop

Requires Node 22+.

```sh
npm install
npm run start:chrome     # opens Chromium with the extension loaded
npm run start:firefox    # opens Firefox with the extension loaded
npm run start:android    # Firefox for Android over adb (USB debugging on)
```

You can also load the repo folder unpacked: `chrome://extensions` → Developer mode → *Load unpacked*, or `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on* → `manifest.json`. The root manifest works in both, with harmless warnings. Settings apply live, so there's no need to reload tabs.

**Firefox and site access:** Firefox lets people withhold "access your data for all websites". Temporary installs often start without it, and then links aren't checked. The welcome page and the popup detect this and offer a one-click *Allow*.

## Test

| Command | What it covers |
|---|---|
| `npm test` | Unit tests for the analyzer (`node --test`): known false positives stay safe, phishing stays flagged, plain-language reasons, trusted-site matching. |
| `npm run test:e2e` | Playwright with Chromium and the real extension loaded. Checks link marks, the click warning, address-bar blocking, *Open anyway*, *I trust this site*, and the welcome page on install. One-time setup: `npx playwright install chromium`. |
| `npm run test:firefox` | Firefox's pre-request blocking via `web-ext run` and a local server: the safe page arrives, the dangerous request never does. Set `FIREFOX_BIN` if Firefox isn't in the usual place. |
| `TYPESAFE_API_KEY=… npm run test:e2e -- jev.live` | Live Jev tests: judgments from the extension's own background, the welcome page's paste-a-key flow, and a wrong key being explained. Skipped without a key. |
| `npm run lint` | `web-ext lint` on the Firefox build (the store's validator). |
| `npm run start:testsite` | A fake neighbourhood forum at `http://localhost:8080/` for trying the real extension by hand. Every link is graded live against what LinkGuard did to it. A *Smart checks* section holds scams the built-in checks miss, so any mark there came from Jev. Scam links on `*.localhost` really open onto fake pages, and the page lists which ones reached the server. `test/unit/cases.test.js` keeps the expected answers in line with the analyzer. |

Why this split: Playwright can load Chromium extensions but not Firefox ones, and Firefox's automation can't open extension pages. So Firefox is tested by watching what reaches the network, which is the behaviour that matters for blocking anyway.

## Install from GitHub

The page people get sent to is the GitHub Pages site in [`docs/`](docs/index.html). It explains LinkGuard in plain words, detects the visitor's browser, and links straight to the newest release.

**Releasing:** bump `version` in `manifest.json` (and `package.json`), then push a matching tag:

```sh
git tag v0.1.0 && git push origin v0.1.0
```

[`.github/workflows/release.yml`](.github/workflows/release.yml) runs the tests and lint, then attaches these to a GitHub Release:

| File | For | How people install it |
|---|---|---|
| `linkguard-chrome.zip` | Chrome, Edge, Brave, Opera, Vivaldi | Unzip, turn on Developer mode in the extensions page, *Load unpacked*. |
| `linkguard-firefox.xpi` | Firefox | Click it and Firefox offers to install it; it stays installed. Only produced when the `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` repo secrets are set (free keys from addons.mozilla.org → Developer Hub → API keys). Firefox won't keep an unsigned add-on. |
| `linkguard-firefox.zip` | addons.mozilla.org | Upload for a store listing. |

The page links to `releases/latest/download/<file>`, so it always serves the newest release without being edited.

**One-time setup:**
- **GitHub Pages:** repo Settings → Pages → *Deploy from a branch* → `main`, folder `/docs`.
- **Firefox signing:** add the two AMO secrets above, and change `gecko.id` to an ID you own first.

**Limits of installing from GitHub instead of a store:**
- Chromium browsers show a developer-mode reminder for unpacked extensions and never update them automatically.
- Signed Firefox add-ons update automatically only with an `update_url`, which isn't set up yet.

The store listings in the next section avoid both.

## Build and share

```sh
npm run build            # dist/chrome, dist/firefox, dist/safari
npm run package          # zips for the Chrome Web Store / Edge and for AMO
npm run sign:firefox     # signed .xpi for self-distribution (needs WEB_EXT_API_KEY / WEB_EXT_API_SECRET)
npm run safari           # Xcode project in safari/ (needs Xcode)
```

`scripts/build.mjs` only changes the manifest per browser:
- **Chrome:** service worker only; block page hidden from fingerprinting with `use_dynamic_url`.
- **Firefox:** event page plus blocking `webRequest`.
- **Safari:** non-persistent background page.

Listing text, permission reasons, data disclosures and store images are ready in [`store/`](store/listing.md) (`npm run store-images` regenerates the images).

**Where to publish, for people who aren't technical:**

| Browser | Where | Cost | Notes |
|---|---|---|---|
| Chrome, Brave, Vivaldi, Opera | Chrome Web Store | $5 once | Can be *Unlisted* (link only). Needs a privacy policy and the in-extension disclosure (both included). |
| Edge | Edge Add-ons | Free | Can be *Hidden*. |
| Firefox desktop + Android | addons.mozilla.org | Free | Use a *listed* add-on: Android only installs from AMO in practice. |
| Safari macOS + iOS | App Store / TestFlight | $99/yr Apple Developer Program | Local testing is free: Safari → Settings → Developer → *Allow unsigned extensions*, then build `safari/` in Xcode. |

Before publishing, change the placeholder IDs: `browser_specific_settings.gecko.id` in `manifest.json` and the Safari bundle identifier in `package.json`. The stores ask for a privacy policy URL: https://filipecabaco.github.io/linkguard/privacy.html (keep it in step with [PRIVACY.md](PRIVACY.md)).
