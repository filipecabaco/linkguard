// Settings save as they change. Non-secret settings sync across the user's browsers; keys stay in local storage only.
const A = self.LinkGuardAnalyzer;
const C = self.LinkGuardConnect;
const syncDefaults = {
  enabled: true, mode: "flag", threshold: 30, allowlist: [], useSafeBrowsing: false, blockNavigation: true,
  useJev: false, jevScope: "external", jevMaxPerPage: 150, jevCanClear: false
};
const localDefaults = { jevKey: "", jevProvider: "typesafe", jevModel: "", jevCustomUrl: "", sbKey: "", jevLastError: "" };
const $ = id => document.getElementById(id);
const radios = name => [...document.querySelectorAll(`input[name=${name}]`)];
let allowlist = [];

let toastTimer;
function saved(text = "Saved") {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 1400);
}
const saveSync = async obj => { await chrome.storage.sync.set(obj); saved(); };
const saveLocal = async obj => { await chrome.storage.local.set(obj); saved(); };

function renderTrusted() {
  const ul = $("trusted");
  ul.textContent = "";
  if (!allowlist.length) {
    const li = document.createElement("li");
    li.className = "empty"; li.textContent = "No trusted sites yet. Use \"I trust this site\" on a warning, or add one below.";
    ul.append(li);
    return;
  }
  for (const site of allowlist) {
    const li = document.createElement("li");
    const rm = document.createElement("button");
    rm.className = "quiet"; rm.textContent = "Remove";
    rm.setAttribute("aria-label", `Stop trusting ${site}`);
    rm.onclick = () => { allowlist = allowlist.filter(d => d !== site); renderTrusted(); saveSync({ allowlist }); };
    li.append(site, rm);
    ul.append(li);
  }
}

function normaliseSite(input) {
  let v = input.trim().toLowerCase();
  if (!v) return "";
  try { v = new URL(/^[a-z]+:\/\//.test(v) ? v : "https://" + v).hostname; } catch { return ""; }
  return v.includes(".") ? A.registrable(v.replace(/^www\./, "")) : "";
}

async function renderSmart() {
  const s = await C.status();
  $("smartPill").textContent = s.on ? "On" : s.connected ? "Paused" : "Off";
  $("smartPill").className = "pill " + (s.on ? "on" : "off");
  $("setup").hidden = s.connected;
  $("testJev").hidden = !s.connected;
  $("disconnect").hidden = !s.connected;
  $("lastErr").textContent = s.on && s.lastError ? "Last problem: " + s.lastError.replace(/^\S+\s/, "") : "";
}

chrome.storage.sync.get(syncDefaults, s => {
  $("enabled").checked = s.enabled;
  $("blockNavigation").checked = s.blockNavigation;
  radios("mode").forEach(r => r.checked = r.value === s.mode);
  radios("threshold").forEach(r => r.checked = Number(r.value) === s.threshold);
  allowlist = s.allowlist;
  renderTrusted();
  $("useSafeBrowsing").checked = s.useSafeBrowsing;
  $("useJev").checked = s.useJev;
  $("jevScope").value = s.jevScope;
  $("jevMaxPerPage").value = s.jevMaxPerPage;
  $("jevCanClear").checked = s.jevCanClear;
});
chrome.storage.local.get(localDefaults, s => {
  $("jevKey").value = s.jevKey;
  $("jevProvider").value = s.jevProvider;
  $("jevModel").value = s.jevModel;
  $("jevCustomUrl").value = s.jevCustomUrl;
  $("sbKey").value = s.sbKey;
  $("customRow").hidden = s.jevProvider !== "custom";
});
renderSmart();
chrome.storage.onChanged.addListener(renderSmart);

for (const id of ["enabled", "blockNavigation", "jevCanClear"]) $(id).onchange = () => saveSync({ [id]: $(id).checked });
radios("mode").forEach(r => r.onchange = () => saveSync({ mode: r.value }));
radios("threshold").forEach(r => r.onchange = () => saveSync({ threshold: Number(r.value) }));
$("jevScope").onchange = () => saveSync({ jevScope: $("jevScope").value });
$("jevMaxPerPage").onchange = () => saveSync({ jevMaxPerPage: Math.max(1, Number($("jevMaxPerPage").value) || 150) });

// Turning on anything that sends link addresses away asks for consent first (Firefox shows its own prompt).
$("useJev").onchange = async () => {
  if ($("useJev").checked && !(await C.requestConsent())) { $("useJev").checked = false; return; }
  saveSync({ useJev: $("useJev").checked });
};
$("useSafeBrowsing").onchange = async () => {
  if ($("useSafeBrowsing").checked && !(await C.requestConsent())) { $("useSafeBrowsing").checked = false; return; }
  saveSync({ useSafeBrowsing: $("useSafeBrowsing").checked });
};

$("jevProvider").onchange = () => { $("customRow").hidden = $("jevProvider").value !== "custom"; saveLocal({ jevProvider: $("jevProvider").value }); };
for (const id of ["jevKey", "jevModel", "jevCustomUrl", "sbKey"]) $(id).onchange = () => saveLocal({ [id]: $(id).value.trim() });
$("toggleKey").onclick = () => {
  const k = $("jevKey"); const show = k.type === "password";
  k.type = show ? "text" : "password"; $("toggleKey").textContent = show ? "Hide" : "Show";
};

$("addForm").addEventListener("submit", e => {
  e.preventDefault();
  const site = normaliseSite($("addSite").value);
  if (!site) { saved("That doesn't look like a website address"); return; }
  allowlist = [...new Set([...allowlist, site])];
  $("addSite").value = "";
  renderTrusted();
  saveSync({ allowlist });
});

$("testJev").onclick = async () => {
  const out = $("testOut");
  out.className = "status"; out.textContent = "Checking…";
  const r = await C.test();
  out.className = "status " + (r.ok ? "ok-text" : "err-text");
  out.textContent = r.ok ? "Working. Smart checks are on." : r.text;
};
$("disconnect").onclick = async () => {
  await C.disconnect();
  $("jevKey").value = "";
  $("useJev").checked = false;
  $("testOut").textContent = "";
  saved("Smart checks disconnected");
};

if (location.hash === "#smart") $("smart").scrollIntoView();
