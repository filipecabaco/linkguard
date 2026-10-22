// Grades each link by what Look Twice did to it: the content script marks links with lg-suspicious / lg-dangerous.
const NAMES = { safe: "Safe", suspicious: "Be careful", dangerous: "Not safe" };
const levelOf = a => a.classList.contains("lg-dangerous") ? "dangerous" : a.classList.contains("lg-suspicious") ? "suspicious" : "safe";
const started = Date.now();

// lg-checking is on a link while Jev judges it. Seeing it once proves smart checks are on.
let jevSeen = false;
new MutationObserver(muts => {
  if (muts.some(m => m.target.classList?.contains("lg-checking"))) jevSeen = true;
}).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });

function gradeSmart() {
  for (const a of document.querySelectorAll("a[data-jev]")) {
    const got = a.closest(".post").querySelector(".got");
    const level = levelOf(a);
    const want = a.dataset.jev;
    let text, ok;
    if (a.classList.contains("lg-checking")) { text = "· Jev is checking…"; ok = null; }
    else if (level !== "safe") { ok = want === "flag"; text = `· Jev flagged it as ${NAMES[level]} ${ok ? "✓" : "✗"}`; }
    else if (!jevSeen) { text = "· not flagged yet (smart checks off, or Jev hasn't answered)"; ok = null; }
    else { ok = want === "safe"; text = ok ? "· Jev left it alone ✓" : "· Jev let it through ✗"; }
    got.textContent = text;
    got.className = "got" + (ok === null ? "" : ok ? " ok" : " bad");
  }
  document.getElementById("jev-status").textContent = jevSeen ? "Smart checks are running on this page." : "";
}

function grade() {
  gradeSmart();
  const links = [...document.querySelectorAll("main a[data-expect]")];
  let right = 0, pending = 0;
  for (const a of links) {
    const got = a.closest(".post").querySelector(".got");
    if (a.dataset.swap) { got.textContent = "· switches address in a few seconds"; pending++; continue; }
    const level = levelOf(a);
    const ok = level === a.dataset.expect;
    if (ok) right++;
    got.textContent = ok ? "· Look Twice agreed ✓" : `· Look Twice said ${NAMES[level]} ✗`;
    got.className = "got " + (ok ? "ok" : "bad");
  }
  const running = document.querySelector(".lg-flag");
  const score = document.getElementById("score");
  if (!running && Date.now() - started > 3000) score.textContent = "Look Twice doesn't seem to be running on this page.";
  else if (running) score.textContent = `Look Twice matched ${right} of ${links.length - pending} links.`;
}
setInterval(grade, 500);

document.getElementById("answers").onchange = e => document.body.classList.toggle("hide-answers", !e.target.checked);

document.getElementById("more").onclick = e => {
  document.getElementById("newer").append(document.getElementById("later").content.cloneNode(true));
  e.target.remove();
};

setTimeout(() => {
  const a = document.querySelector("a[data-swap]");
  a.href = a.dataset.swap;
  delete a.dataset.swap;
}, 5000);

document.addEventListener("click", e => {
  const b = e.target.closest("button[data-copy]");
  if (!b) return;
  navigator.clipboard.writeText(b.dataset.copy).then(() => { b.textContent = "Copied"; setTimeout(() => b.textContent = "Copy", 1500); });
});

async function showVisits() {
  const list = await fetch("/__visits").then(r => r.json()).catch(() => null);
  if (!list) return;
  const ol = document.getElementById("visits");
  ol.replaceChildren(...(list.length ? list : [null]).map(v => {
    const li = document.createElement("li");
    if (!v) { li.className = "none"; li.textContent = "None yet."; return li; }
    li.textContent = `${new Date(v.at).toLocaleTimeString()} · ${v.browser} · ${v.url}`;
    return li;
  }));
}
showVisits();
setInterval(showVisits, 1500);
