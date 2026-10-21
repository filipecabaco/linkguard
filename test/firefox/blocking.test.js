// Firefox blocks with webRequest before the request is sent, a different path from Chromium, so it gets its own test.
// Firefox automation can't open extension pages, so a local server watches what the browser asks for instead:
// the safe page must arrive, the dangerous address must never reach the server.
// Uses the Firefox web-ext finds, or FIREFOX_BIN=/path/to/firefox.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");

const PORT = 8765;
const DANGEROUS = `http://127.0.0.1:${PORT}/paypal/verify.exe`; // raw IP + program download: dangerous
const PAGES = {
  "/": `<p>start</p><script>setTimeout(() => location.href = "/safe", 3000)</script>`,
  "/safe": `<p>safe</p><script>setTimeout(() => location.href = "${DANGEROUS}", 1000)</script>`
};

test("Firefox stops a dangerous address before the request leaves", { timeout: 60_000 }, async () => {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push(req.url);
    res.setHeader("content-type", "text/html");
    res.end(PAGES[req.url] || "reached");
  }).listen(PORT);

  const args = ["web-ext", "run", "--source-dir", path.join(__dirname, "../../dist/firefox"),
    "--start-url", `http://127.0.0.1:${PORT}/`, "--arg=--headless", "--no-reload", "--no-input"];
  if (process.env.FIREFOX_BIN) args.push("--firefox", process.env.FIREFOX_BIN);
  const firefox = spawn("npx", args, { stdio: "ignore", detached: true });

  try {
    const end = Date.now() + 30_000;
    while (!seen.includes("/safe") && Date.now() < end) await new Promise(r => setTimeout(r, 200));
    assert.ok(seen.includes("/safe"), `Firefox never reached the safe page (saw ${JSON.stringify(seen)})`);
    await new Promise(r => setTimeout(r, 4000));
    assert.ok(!seen.includes("/paypal/verify.exe"), "the dangerous request reached the server");
  } finally {
    process.kill(-firefox.pid, "SIGTERM");
    server.close();
  }
});
