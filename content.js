// LinkGuard content script: scans links, flags them, intercepts clicks on risky ones.
(() => {
  const A = self.LinkGuardAnalyzer;
  const seen = new WeakMap();
  const flagged = new Map(); // url -> { level, score, reasons, headline, count }
  const stats = { scanned: 0, suspicious: 0, dangerous: 0, jevChecked: 0, jevErrors: 0, items: [] };
  const DEFAULTS = {
    mode: "flag", threshold: 30, allowlist: [], useSafeBrowsing: false, enabled: true,
    useJev: false, jevScope: "external", jevMaxPerPage: 150, jevCanClear: false
  };
  let settings = { ...DEFAULTS };
  let jevSent = 0;
  let observer = null;

  const trusted = host => settings.allowlist.some(d => A.sameOrSub(host, d));
  const pageTrusted = () => trusted(location.hostname);

  chrome.storage.sync.get(DEFAULTS, s => {
    settings = { ...settings, ...s };
    start();
  });

  // Settings apply live: no page reload needed after changing them.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [k, { newValue }] of Object.entries(changes)) if (k in DEFAULTS) settings[k] = newValue ?? DEFAULTS[k];
    if (!settings.enabled || pageTrusted()) { stop(); return; }
    document.querySelectorAll("a[data-linkguard]").forEach(a => {
      try { if (trusted(new URL(a.href).hostname)) unflag(a); } catch {}
    });
    start();
  });

  function start() {
    if (!settings.enabled || pageTrusted() || observer) return;
    scanAll();
    observer = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === "attributes") { check(m.target); continue; }
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.tagName === "A") check(n);
          n.querySelectorAll && n.querySelectorAll("a[href]").forEach(check);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
  }

  function stop() {
    observer?.disconnect();
    observer = null;
    document.querySelectorAll("a[data-linkguard]").forEach(unflag);
  }

  function scanAll() { document.querySelectorAll("a[href]").forEach(check); }

  function linkText(a) {
    const badge = a.querySelector(":scope > .lg-mark");
    return (a.textContent || "").slice(badge ? badge.textContent.length : 0);
  }

  function check(a) {
    if (a.tagName !== "A") return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || seen.get(a) === href) return;
    if (a.dataset.linkguard) unflag(a);
    seen.set(a, href);
    stats.scanned++;

    try { if (trusted(new URL(a.href).hostname)) return; } catch {}
    const res = A.analyze(href, linkText(a), location.hostname);
    if (res.score >= settings.threshold) flag(a, res);

    if (settings.useJev && jevEligible(a, res) && jevSent < settings.jevMaxPerPage) {
      jevSent++;
      a.classList.add("lg-checking");
      chrome.runtime.sendMessage(
        { type: "jevCheck", url: a.href, text: linkText(a), pageHost: location.hostname, heuristic: res },
        j => {
          a.classList.remove("lg-checking");
          if (chrome.runtime.lastError || !j) return;
          if (j.error) { stats.jevErrors++; return; }
          stats.jevChecked++;
          const merged = mergeJev(res, j);
          if (merged.cleared) { if (a.dataset.linkguard && a.dataset.linkguard !== "dangerous") unflag(a); return; }
          if (merged.score >= settings.threshold) flag(a, merged);
        }
      );
    }

    if (settings.useSafeBrowsing && /^https?:/i.test(a.href)) {
      chrome.runtime.sendMessage({ type: "sbCheck", url: a.href }, r => {
        if (chrome.runtime.lastError || !r || !r.threat) return;
        flag(a, { score: 100, level: "dangerous", headline: "Google lists this link as dangerous",
          reasons: ["Google Safe Browsing lists this page as dangerous", ...res.reasons] });
      });
    }
  }

  function jevEligible(a, res) {
    if (!/^https?:/i.test(a.href)) return false;
    if (settings.jevScope === "all") return true;
    if (res.score > 0) return true;
    if (settings.jevScope === "signals") return false;
    try { return A.registrable(new URL(a.href).hostname) !== A.registrable(location.hostname); }
    catch { return false; }
  }

  // Jev never lowers a heuristic "dangerous" verdict; it can only raise risk,
  // or (if the user allows it) clear a mild heuristic false positive.
  function mergeJev(h, j) {
    if (settings.jevCanClear && j.category === "safe" && j.categoryProb >= 0.85 &&
        j.harmful < 0.15 && h.score < 60) return { cleared: true };
    const score = Math.max(h.score, j.score);
    const level = score >= 60 ? "dangerous" : score >= 30 ? "suspicious" : "safe";
    return { score, level, headline: h.headline || "LinkGuard's smart check flagged this link", reasons: [...j.reasons, ...h.reasons] };
  }

  function report() {
    stats.items = [...flagged.entries()].map(([url, i]) => ({ url, level: i.level, score: i.score, reasons: i.reasons, headline: i.headline }));
    chrome.runtime.sendMessage({ type: "stats", dangerous: stats.dangerous, suspicious: stats.suspicious }).catch?.(() => {});
  }

  function flag(a, res) {
    const prev = a.dataset.linkguard;
    if (prev === "dangerous" && res.level !== "dangerous") return;
    if (!prev) stats[res.level]++;
    else if (prev !== res.level) { stats[prev]--; stats[res.level]++; }

    a.dataset.linkguard = res.level;
    a.dataset.linkguardReasons = JSON.stringify(res.reasons);
    a.dataset.linkguardHeadline = res.headline || "";
    a.classList.add("lg-flag", "lg-" + res.level);
    a.classList.remove(res.level === "dangerous" ? "lg-suspicious" : "lg-dangerous");
    a.title = `LinkGuard: ${res.headline || (res.level === "dangerous" ? "looks dangerous" : "looks suspicious")}\n` +
      res.reasons.slice(0, 3).map(r => "• " + r).join("\n");

    let mark = a.querySelector(":scope > .lg-mark");
    if (!mark) {
      mark = document.createElement("span");
      mark.className = "lg-mark";
      a.prepend(mark);
    }
    mark.textContent = res.level === "dangerous" ? "!" : "?";
    mark.dataset.level = res.level;
    mark.setAttribute("aria-label", res.level === "dangerous" ? "LinkGuard: dangerous link" : "LinkGuard: suspicious link");
    mark.setAttribute("role", "img");

    a.classList.toggle("lg-disabled", settings.mode === "disable" && res.level === "dangerous");

    const item = flagged.get(a.href);
    flagged.set(a.href, { level: res.level, score: res.score, reasons: res.reasons, headline: res.headline,
      count: (item ? item.count : 0) + (prev ? 0 : 1) });
    report();
  }

  function unflag(a) {
    const level = a.dataset.linkguard;
    if (!level) return;
    stats[level]--;
    const item = flagged.get(a.href);
    if (item && --item.count <= 0) flagged.delete(a.href);
    a.classList.remove("lg-flag", "lg-suspicious", "lg-dangerous", "lg-disabled", "lg-checking");
    a.querySelector(":scope > .lg-mark")?.remove();
    delete a.dataset.linkguard; delete a.dataset.linkguardReasons; delete a.dataset.linkguardHeadline;
    a.removeAttribute("title");
    seen.delete(a);
    report();
  }

  // Intercept clicks on flagged links
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest("a[data-linkguard]");
    if (!a || a.dataset.lgApproved === "1") return;
    const level = a.dataset.linkguard;
    if (level !== "dangerous" && !(level === "suspicious" && settings.mode !== "flag-lite")) return;
    e.preventDefault(); e.stopImmediatePropagation();
    showWarning(a, a.classList.contains("lg-disabled"));
  }, true);

  // ---- Click warning: the return slip, rendered in a closed shadow root so page styles can't reach it.
  const CSS = `
    :host { all: initial; }
    .overlay { position: fixed; inset: 0; z-index: 2147483647; background: rgba(20, 16, 10, .55); display: flex; align-items: center; justify-content: center;
      padding: 16px; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1C2238; }
    .card { --ink:#1C2238; --ink-2:#4A5068; --label:#F6F5F1; --rule:#1C223833; --stamp:#E2382B; --stamp-text:#C1261B; --tag:#F2B705; --tag-edge:#8A6500; --kraft:#B48A5C;
      background: var(--label); color: var(--ink); width: min(520px, 100%); max-height: calc(100vh - 32px); overflow: auto; border-radius: 4px;
      box-shadow: 0 18px 40px rgba(61, 42, 20, .35); }
    .band { background: var(--kraft); color: var(--ink); display: flex; align-items: center; gap: 8px; padding: 10px 20px;
      font: 800 14px/1 "LG Archivo", "Arial Narrow", "Roboto Condensed", sans-serif; font-stretch: 80%; letter-spacing: .06em; text-transform: uppercase; }
    .band svg { width: 18px; height: 20px; }
    .body { padding: 22px 24px 20px; }
    h2 { margin: 0; font: 800 30px/1.05 "LG Archivo", "Arial Narrow", "Roboto Condensed", sans-serif; font-stretch: 75%; letter-spacing: -.005em; text-wrap: balance; }
    .addr { position: relative; margin-top: 18px; border: 1px solid var(--ink); border-radius: 3px; padding: 12px 14px; }
    .k { font: 700 11px/1 "LG Archivo", "Arial Narrow", sans-serif; font-stretch: 88%; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-2); }
    .url { margin-top: 6px; font: 500 14px/1.4 ui-monospace, "SF Mono", Menlo, Consolas, monospace; word-break: break-all; }
    .url mark { background: rgba(226, 56, 43, .12); color: var(--stamp-text); font-weight: 700; padding: 0 2px; border-radius: 2px; }
    .stamp { position: absolute; right: -10px; top: -22px; transform: rotate(-9deg); border: 4px double var(--stamp); color: var(--stamp-text); background: var(--label);
      border-radius: 5px; padding: 4px 10px 2px; font: 900 22px/1 "LG Archivo", "Arial Narrow", "Roboto Condensed", sans-serif; font-stretch: 68%; letter-spacing: .06em; text-transform: uppercase; }
    .stamp.sus { border: 2px dashed var(--tag-edge); background: var(--tag); color: var(--ink); }
    .slip-h { margin: 20px 0 0; padding-bottom: 8px; border-bottom: 2px solid var(--ink); font: 700 12px/1 "LG Archivo", "Arial Narrow", sans-serif; font-stretch: 88%; letter-spacing: .14em; text-transform: uppercase; }
    ul { list-style: none; margin: 0; padding: 0; }
    li { display: grid; grid-template-columns: 20px 1fr; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--rule); font-size: 15px; line-height: 1.4; }
    .box { width: 16px; height: 16px; border: 1.5px solid var(--ink); border-radius: 2px; margin-top: 2px; position: relative; }
    .box::after { content: ""; position: absolute; left: 3px; top: -5px; width: 6px; height: 14px; border: solid var(--stamp); border-width: 0 3px 3px 0; transform: rotate(40deg); }
    .sus .box::after { border-color: var(--tag-edge); }
    .locked { margin: 14px 0 0; font-size: 14px; color: var(--ink-2); }
    .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; margin-top: 20px; }
    button { font: inherit; cursor: pointer; }
    .back { background: var(--ink); color: var(--label); border: 0; border-radius: 10px; min-height: 48px; padding: 0 24px; font-weight: 700; font-size: 16px; }
    .back:hover { filter: brightness(1.15); }
    .quiet { background: none; border: 0; padding: 8px 2px; color: var(--ink-2); font-size: 14px; text-decoration: underline; text-underline-offset: 4px; }
    .quiet:hover { color: var(--ink); }
    button:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
    @media (prefers-color-scheme: dark) {
      .card { --ink:#ECEAE4; --ink-2:#A9AEBC; --label:#1E2129; --rule:rgba(236,234,228,.18); --stamp:#FF5A4E; --stamp-text:#FF7A70; --tag-edge:#F2B705; --kraft:#4A3826; }
      .band { color: #F1E6D6; }
      .stamp.sus { color: #1C2238; }
      .url mark { background: rgba(255, 90, 78, .16); }
    }
    @media (max-width: 480px) { .actions { flex-direction: column; align-items: stretch; } .back { width: 100%; } .quiet { text-align: left; } }
    @media (prefers-reduced-motion: no-preference) {
      .card { animation: rise 200ms cubic-bezier(.16, 1, .3, 1) both; }
      .stamp { animation: land 220ms cubic-bezier(.16, 1, .3, 1) both 120ms; }
      @keyframes rise { from { opacity: 0; transform: translateY(8px); } }
      @keyframes land { from { opacity: 0; transform: rotate(-9deg) scale(1.18); } }
    }`;

  let sheet = null;
  function styleInto(root) {
    try {
      if (!sheet) { sheet = new CSSStyleSheet(); sheet.replaceSync(CSS); }
      root.adoptedStyleSheets = [sheet];
    } catch {
      const s = document.createElement("style");
      s.textContent = CSS;
      root.append(s);
    }
  }

  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    el.append(...kids.filter(k => k != null && k !== false));
    return el;
  }

  function markedUrl(url) {
    const out = h("div", { class: "url" });
    try {
      const u = new URL(url);
      const reg = A.registrable(u.hostname);
      const i = url.indexOf(reg, url.indexOf(u.hostname));
      if (i >= 0) { out.append(url.slice(0, i), h("mark", {}, reg), url.slice(i + reg.length)); return out; }
    } catch {}
    out.textContent = url;
    return out;
  }

  let host = null;
  function showWarning(a, locked) {
    host?.remove();
    const level = a.dataset.linkguard;
    const sus = level === "suspicious";
    const reasons = JSON.parse(a.dataset.linkguardReasons || "[]");
    const headline = a.dataset.linkguardHeadline || (sus ? "This link looks suspicious" : "This link looks dangerous");
    const opener = document.activeElement;

    host = document.createElement("linkguard-warning");
    const root = host.attachShadow({ mode: "closed" });
    styleInto(root);

    const close = () => {
      host?.remove(); host = null;
      document.removeEventListener("keydown", onKey, true);
      opener && opener.focus && opener.focus();
    };
    const openAnyway = () => {
      chrome.runtime.sendMessage({ type: "allowOnce", url: a.href }, () => {
        void chrome.runtime.lastError;
        a.dataset.lgApproved = "1"; close(); a.click();
        setTimeout(() => delete a.dataset.lgApproved, 1000);
      });
    };
    const trustSite = () => {
      const site = A.registrable(new URL(a.href).hostname);
      chrome.storage.sync.set({ allowlist: [...new Set([...settings.allowlist, site])] });
      close();
    };

    const back = h("button", { class: "back", onclick: close }, "Go back to safety");
    const card = h("div", { class: "card", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "lg-h" },
      h("div", { class: "band" },
        svgMark(), "LinkGuard"),
      h("div", { class: "body" },
        h("h2", { id: "lg-h" }, headline),
        h("div", { class: "addr" },
          h("div", { class: "k" }, "It really goes to"),
          markedUrl(a.href),
          h("div", { class: "stamp" + (sus ? " sus" : ""), "aria-hidden": "true" }, sus ? "Look twice" : "Not safe")),
        h("p", { class: "slip-h" }, "Why LinkGuard warned you"),
        h("ul", {}, ...reasons.slice(0, 3).map(r => h("li", { class: sus ? "sus" : "" }, h("span", { class: "box" }), r))),
        locked ? h("p", { class: "locked" }, "Your settings block dangerous links. To open it, mark the site as trusted.") : null,
        h("div", { class: "actions" },
          back,
          locked ? null : h("button", { class: "quiet", onclick: openAnyway }, "Open anyway"),
          h("button", { class: "quiet", onclick: trustSite }, "I trust this site"))));
    const overlay = h("div", { class: "overlay", onclick: e => { if (e.target === overlay) close(); } }, card);
    root.append(overlay);
    document.documentElement.appendChild(host);
    back.focus();

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const items = [...root.querySelectorAll("button")];
      const i = items.indexOf(root.activeElement);
      const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === items.length - 1 ? 0 : i + 1);
      e.preventDefault();
      items[next].focus();
    }
    document.addEventListener("keydown", onKey, true);
  }

  function svgMark() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 30 34"); svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.5"); svg.setAttribute("aria-hidden", "true");
    for (const d of ["M15 2 3 6.5v9.2C3 24 8.6 29.6 15 32c6.4-2.4 12-8 12-16.3V6.5L15 2Z", "M9 17.5l4 4 8-9"]) {
      const p = document.createElementNS(ns, "path"); p.setAttribute("d", d); svg.append(p);
    }
    return svg;
  }

  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg.type === "getStats" && window === window.top) reply({ ...stats, enabled: settings.enabled, trusted: pageTrusted(), host: location.hostname });
    if (msg.type === "rescan" && window === window.top) {
      document.querySelectorAll("a[href]").forEach(a => seen.delete(a));
      stats.scanned = 0;
      scanAll();
      reply({ ...stats, enabled: settings.enabled, trusted: pageTrusted(), host: location.hostname });
    }
  });
})();
