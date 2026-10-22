const $ = id => document.getElementById(id);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
let tab = null;
let pageHost = "";

const A = self.LinkGuardAnalyzer;

function setSummary(headline, sub, ok) {
  $("headline").textContent = headline;
  $("sub").textContent = sub || "";
  $("summary").classList.toggle("ok", Boolean(ok));
}

function render(s) {
  const list = $("list");
  list.textContent = "";
  $("rescan").hidden = false;
  $("trust").hidden = true;
  if (!s) {
    $("rescan").hidden = true;
    if (!siteAccess) {
      setSummary("LinkGuard can't see websites yet", "Your browser needs your OK first.");
      $("allow").hidden = false;
      return;
    }
    setSummary("LinkGuard can't check this page", "Browser pages and the extension store are off-limits to extensions.");
    return;
  }
  if (!s.enabled) { setSummary("Protection is off", "Turn it back on with the switch above."); $("rescan").hidden = true; return; }
  if (s.trusted) {
    setSummary("You trust this site", `Links on ${s.host} aren't checked.`);
    $("trust").hidden = false; $("trust").textContent = "Stop trusting this site";
    $("rescan").hidden = true;
    return;
  }
  $("trust").hidden = false; $("trust").textContent = "Trust this site";
  const risky = s.items.length;
  if (!risky) { setSummary("Nothing risky here", `Checked ${plural(s.scanned, "link", "links")} on ${s.host}.`, true); return; }
  const bad = s.items.filter(i => i.level === "dangerous").length;
  setSummary(
    bad ? `${plural(bad, "link isn't", "links aren't")} safe` : `${plural(risky, "link needs", "links need")} a look`,
    `Checked ${plural(s.scanned, "link", "links")} on ${s.host}.${bad && risky > bad ? ` ${plural(risky - bad, "more looks", "more look")} odd.` : ""}`);

  for (const i of s.items.sort((a, b) => b.score - a.score).slice(0, 30)) {
    const li = document.createElement("li");
    const top = document.createElement("div");
    top.className = "top";
    const stamp = document.createElement("span");
    stamp.className = "stamp sm" + (i.level === "dangerous" ? "" : " sus");
    stamp.textContent = i.level === "dangerous" ? "Not safe" : "Look twice";
    const b = document.createElement("b");
    b.textContent = i.headline || (i.level === "dangerous" ? "This link looks dangerous" : "This link looks suspicious");
    top.append(stamp, b);
    const u = document.createElement("div");
    u.className = "u"; u.textContent = i.url;
    const r = document.createElement("div");
    r.className = "r"; r.textContent = i.reasons.slice(0, 2).join(" · ");
    li.append(top, u, r);
    list.append(li);
  }
  if (risky > 30) {
    const more = document.createElement("li");
    more.className = "more"; more.textContent = `And ${risky - 30} more, marked on the page.`;
    list.append(more);
  }
}

async function renderSmart(s) {
  const el = $("smart");
  const local = await chrome.storage.local.get({ jevKey: "", jevLastError: "" });
  const sync = await chrome.storage.sync.get({ useJev: false });
  el.textContent = "";
  el.hidden = false;
  const link = (text, href) => { const a = document.createElement("a"); a.href = href; a.target = "_blank"; a.className = "quiet"; a.textContent = text; return a; };
  if (!sync.useJev || !local.jevKey) {
    el.append("Smart checks are off.", link("Turn them on", "welcome.html#smart"));
  } else if (s && s.jevErrors) {
    el.append(`Smart checks couldn't check ${plural(s.jevErrors, "link", "links")}.`, link("See why", "options.html#smart"));
  } else {
    el.append(s && s.jevChecked ? `Smart checks on · ${plural(s.jevChecked, "link", "links")} checked` : "Smart checks are on.");
  }
}

function ask(type) {
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, { type }, { frameId: 0 }, res => {
    const s = chrome.runtime.lastError ? null : res;
    render(s);
    renderSmart(s);
  });
}

chrome.storage.sync.get({ enabled: true, allowlist: [] }, s => {
  $("enabled").checked = s.enabled;
  $("stateText").textContent = s.enabled ? "On" : "Off";
});
$("enabled").onchange = async () => {
  const on = $("enabled").checked;
  $("stateText").textContent = on ? "On" : "Off";
  await chrome.storage.sync.set({ enabled: on });
  setTimeout(() => ask("getStats"), 150);
};
$("rescan").onclick = () => ask("rescan");
$("trust").onclick = async () => {
  if (!pageHost) return;
  const site = A.registrable(pageHost);
  const { allowlist } = await chrome.storage.sync.get({ allowlist: [] });
  const next = $("trust").textContent.startsWith("Stop")
    ? allowlist.filter(d => !A.sameOrSub(pageHost, d))
    : [...new Set([...allowlist, site])];
  await chrome.storage.sync.set({ allowlist: next });
  setTimeout(() => ask("rescan"), 150);
};

// Firefox lets people withhold site access; without it the content script never runs.
let siteAccess = true;
$("allow").onclick = async () => {
  try { siteAccess = await chrome.permissions.request({ origins: ["<all_urls>"] }); } catch {}
  if (siteAccess) { $("allow").hidden = true; setSummary("Thanks. Reload the page to check it.", ""); }
};

chrome.tabs.query({ active: true, currentWindow: true }, async ([t]) => {
  tab = t;
  try { pageHost = new URL(t.url).hostname; } catch {}
  try { siteAccess = await chrome.permissions.contains({ origins: ["<all_urls>"] }); } catch {}
  ask("getStats");
});
