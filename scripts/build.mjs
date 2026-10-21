// Builds one folder per browser in dist/ from the shared source. Usage: node scripts/build.mjs [chrome|firefox|safari ...]
// manifest.json in the repo root stays loadable unpacked in Chrome and Firefox for development; each target only
// differs where a browser needs it to.
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const FILES = [
  "analyzer.js", "background.js", "content.js", "styles.css", "ui.css", "connect.js",
  "popup.html", "popup.js", "options.html", "options.js", "welcome.html", "welcome.js",
  "blocked.html", "blocked.js", "icons", "fonts"
];

const TARGETS = {
  // Chrome, Edge, Brave, Opera, Vivaldi. Service worker only; hide the block page's URL from fingerprinting.
  chrome(m) {
    delete m.background.scripts;
    delete m.browser_specific_settings;
    m.web_accessible_resources[0].use_dynamic_url = true;
  },
  // Firefox desktop and Android. Event page, plus blocking webRequest so dangerous pages are stopped before the request leaves.
  firefox(m) {
    m.background = { scripts: m.background.scripts };
    m.permissions.push("webRequest", "webRequestBlocking");
  },
  // Safari (macOS, iOS). Non-persistent background page; no Firefox settings.
  safari(m) {
    m.background = { scripts: m.background.scripts, persistent: false };
    delete m.browser_specific_settings;
  }
};

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TARGETS);
const base = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));

for (const target of wanted) {
  if (!TARGETS[target]) throw new Error(`Unknown target "${target}". Use: ${Object.keys(TARGETS).join(", ")}`);
  const out = join(root, "dist", target);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  for (const f of FILES) await cp(join(root, f), join(out, f), { recursive: true });
  const manifest = structuredClone(base);
  TARGETS[target](manifest);
  await writeFile(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`built dist/${target}`);
}
