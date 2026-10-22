// Local test site for trying Look Twice's checks in a real browser with the real extension.
//   npm run start:testsite        then open http://localhost:8080/  (PORT=… to change)
// The board is a fake neighbourhood forum full of links, each graded live against what Look Twice did to it.
// *.localhost and 127.0.0.1 resolve to this machine, so those "scam" links really open: they land on fake pages
// served here, and every visit is logged so you can see which dangerous requests reached a server at all.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { cases } = require("./cases");

const PORT = Number(process.env.PORT) || 8080;
const BOARD = `localhost:${PORT}`;
const { posts, later, swap, addressBar, smart, smartAddressBar } = cases(PORT);
const visits = [];

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const LEVEL = { safe: "Safe", suspicious: "Be careful", dangerous: "Not safe" };
const SMART = { flag: "Jev should flag", safe: "Jev should leave alone" };

function post(p, extra = "") {
  return `<article class="post">
    <header><b>${esc(p.who)}</b> <span>${esc(p.when)}</span></header>
    <p>${esc(p.before)} <a href="${esc(p.href)}" data-expect="${p.expect}"${extra}>${esc(p.text)}</a></p>
    <footer class="answer" data-level="${p.expect}"><span class="expect">${LEVEL[p.expect]}</span> ${esc(p.check)} <span class="got"></span></footer>
  </article>`;
}

function smartPost(p) {
  return `<article class="post">
    <header><b>${esc(p.who)}</b> <span>${esc(p.when)}</span></header>
    <p>${esc(p.before)} <a href="${esc(p.href)}" data-jev="${p.expect}">${esc(p.text)}</a></p>
    <footer class="answer" data-level="${p.expect === "flag" ? "dangerous" : "safe"}"><span class="expect">${SMART[p.expect]}</span> ${esc(p.check)} <span class="got"></span></footer>
  </article>`;
}

function board() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Maple Street board · Look Twice test site</title><link rel="stylesheet" href="/__site/board.css"></head>
<body>
<div class="testbar">
  <b>Look Twice test site.</b> Nothing here is real. <span id="score">Waiting for Look Twice…</span>
  <label><input type="checkbox" id="answers" checked> Show answers</label>
</div>
<main>
  <h1>Maple Street neighbours</h1>
  <p class="lede">Local news, lost cats and the occasional suspicious link.</p>

  <section class="panel smart">
    <h2>Smart checks (Jev)</h2>
    <p>The built-in checks call every link in this section safe, so any mark here came from Jev.
      Turn on smart checks with your TypeSafe key in Look Twice's settings first. <span id="jev-status"></span></p>
    ${smart.map(smartPost).join("\n")}
    <p>Paste these into the address bar. They open, then Jev should replace the page with the stop page a moment later:</p>
    <ul class="urls">${smartAddressBar.map(a => `<li><code>${esc(a.href)}</code> <span class="expect" data-level="dangerous">${SMART[a.expect]}</span> <button type="button" data-copy="${esc(a.href)}">Copy</button></li>`).join("")}</ul>
  </section>

  <h2>Built-in checks</h2>
  <button id="more" type="button">Show 2 newer posts</button>
  <div id="newer"></div>
  ${post(swap, ` data-swap="${esc(swap.swapTo)}"`)}
  ${posts.map(p => post(p)).join("\n")}
  <template id="later">${later.map(p => post(p)).join("\n")}</template>

  <section class="panel">
    <h2>Try the address bar</h2>
    <p>Paste these into the address bar. Dangerous ones should open Look Twice's full-page stop instead of the site.</p>
    <ul class="urls">${addressBar.map(a => `<li><code>${esc(a.href)}</code> <span class="expect" data-level="${a.expect}">${LEVEL[a.expect]}</span> <button type="button" data-copy="${esc(a.href)}">Copy</button></li>`).join("")}</ul>
  </section>

  <section class="panel">
    <h2>Fake pages that reached this server</h2>
    <p>Firefox stops dangerous addresses before the request is sent, so blocked visits never show up here.
      Chrome can only replace the tab once loading has started, so a blocked visit may still appear. Opening anyway always does.</p>
    <ol id="visits"><li class="none">None yet.</li></ol>
  </section>
  <p class="note">Built-in answers assume Look Twice's default settings: "Be careful" from a score of 30, Safe Browsing off.
    With smart checks on, Jev can also raise a built-in "Safe" or "Be careful", so a few of those may differ.</p>
</main>
<script src="/__site/board.js"></script>
</body></html>`;
}

// What a scam link lands on once Look Twice lets it through. Plainly fake, and the form sends nothing.
function fakePage(host, url) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fake page · Look Twice test site</title><link rel="stylesheet" href="http://${BOARD}/__site/board.css"></head>
<body class="fake">
<div class="testbar"><b>Look Twice test site.</b> This stands in for a scam page. You got here because Look Twice let it open:
  you chose "Open anyway", trusted the site, or it wasn't stopped.</div>
<main>
  <h1>Please confirm your details</h1>
  <p>Your account is on hold. Sign in within 24 hours to avoid losing access.</p>
  <form id="fake"><label>Email <input type="email" autocomplete="off"></label>
    <label>Password <input type="password" autocomplete="off"></label><button>Continue</button></form>
  <p id="sent" hidden>Nothing was sent. On a real scam site, this is where your password would have gone.</p>
  <p class="note">Address: <code>${esc(host + url)}</code> · <a href="http://${BOARD}/">Back to the board</a></p>
</main>
<script>document.getElementById("fake").onsubmit = e => { e.preventDefault(); document.getElementById("sent").hidden = false; };</script>
</body></html>`;
}

function browser(ua = "") {
  return /Firefox\//.test(ua) ? "Firefox" : /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other";
}

function handle(req, res) {
  const host = (req.headers.host || BOARD).toLowerCase();
  const name = host.replace(/:\d+$/, "");
  const url = req.url;

  if (url.startsWith("/__site/")) {
    const file = path.join(__dirname, "site", path.basename(url.split("?")[0]));
    const type = file.endsWith(".css") ? "text/css" : "text/javascript";
    return fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": type, "access-control-allow-origin": "*" });
      res.end(body);
    });
  }
  if (url === "/__visits") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    return res.end(JSON.stringify(visits));
  }
  if (name === "localhost") {
    if (url !== "/") { res.writeHead(302, { location: "/" }); return res.end(); }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(board());
  }
  if (url === "/favicon.ico") { res.writeHead(404); return res.end(); }

  // Anything else is one of the scam addresses: a *.localhost name or the bare 127.0.0.1.
  visits.unshift({ at: new Date().toISOString(), url: `http://${host}${url}`, browser: browser(req.headers["user-agent"]) });
  visits.length = Math.min(visits.length, 50);
  console.log(`reached the server: http://${host}${url} (${visits[0].browser})`);
  if (/\.(exe|msi)$/i.test(url)) {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    return res.end("Look Twice test site: a pretend program download. There is nothing here to run.\n");
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(fakePage(host, url));
}

// Browsers may try ::1 or 127.0.0.1 for localhost names, so answer on both. Neither is reachable from the network.
http.createServer(handle).listen(PORT, "127.0.0.1", () => console.log(`Look Twice test site: http://${BOARD}/`));
http.createServer(handle).listen(PORT, "::1").on("error", () => {});
