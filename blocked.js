// Block page: shown instead of a dangerous page opened from the address bar, a bookmark or another app.
// It's web-accessible (Firefox redirects need that), so refuse to work inside another site's frame: no clickjacking "trust".
if (window.top !== window) { document.documentElement.textContent = ""; throw new Error("LinkGuard: block page can't be framed"); }
const A = self.LinkGuardAnalyzer;
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const target = params.get("u") || "";
const afterLoad = params.get("when") === "after";

const LEDES = {
  brand: b => `Pages like this copy ${b}'s website to steal your password or card number.`,
  mismatch: () => "The link showed one address but leads to another. That's a common trick to get you onto a fake page.",
  download: () => "Programs from links like this can take over your device or lock your files.",
  scam: () => "Pages like this promise prizes or easy money to get your card details.",
  hidden: () => "The address is disguised so you can't tell which website it really is.",
  lookalike: () => "The address uses letters that look like normal ones to imitate another website.",
  code: () => "This link runs hidden code instead of opening a normal page.",
  phishing: () => "Pages like this copy a real website to steal your password or card number.",
  malware: () => "Software from pages like this can take over your device or lock your files.",
  spam: () => "This page is unwanted advertising and may lead somewhere worse."
};

function highlight(url) {
  const el = $("url");
  el.textContent = "";
  let u;
  try { u = new URL(url); } catch { el.textContent = url; return; }
  const reg = A.registrable(u.hostname);
  const i = url.indexOf(reg, url.indexOf(u.hostname));
  if (i < 0) { el.textContent = url; return; }
  const mark = document.createElement("mark");
  mark.textContent = reg;
  el.append(url.slice(0, i), mark, url.slice(i + reg.length));
}

function render(v) {
  const level = v.level === "dangerous" ? "dangerous" : "suspicious";
  $("headline").textContent = v.headline || "This link looks dangerous";
  document.title = `LinkGuard stopped this page: ${v.headline || "dangerous link"}`;
  const lede = LEDES[v.kind];
  if (lede) $("lede").textContent = lede(v.brand);
  if (v.threat) $("lede").textContent = "Google lists this page as dangerous. It may try to steal your details or install harmful software.";
  if (afterLoad) $("note").textContent = "Stopped after a second check";
  highlight(target);

  const top = v.reasons.slice(0, 3);
  const ul = $("reasons");
  ul.textContent = "";
  for (const r of top) {
    const li = document.createElement("li");
    li.className = "on" + (level === "suspicious" ? " sus" : "");
    const box = document.createElement("span");
    box.className = "box";
    li.append(box, r);
    ul.append(li);
  }
  if (v.reasons.length > 3 || v.score != null) {
    $("more").hidden = false;
    const all = $("allReasons");
    all.textContent = "";
    for (const r of v.reasons) { const li = document.createElement("li"); li.textContent = r; all.append(li); }
    $("score").textContent = `Risk score ${v.score}/100. LinkGuard stops pages at 60 and above.`;
  }
  const remote = [v.threat && "Google Safe Browsing", v.jev && "Jev"].filter(Boolean);
  $("privacy").textContent = remote.length
    ? `Checked on this device and by ${remote.join(" and ")}.`
    : "Checked on this device. Nothing about this page was sent anywhere.";
}

const send = msg => new Promise(res => chrome.runtime.sendMessage(msg, r => res(chrome.runtime.lastError ? null : r)));

$("back").onclick = () => send({ type: "goBack" });
$("open").onclick = async () => {
  await send({ type: "allowOnce", url: target });
  location.replace(target);
};
$("trust").onclick = () => {
  let host = target;
  try { host = A.registrable(new URL(target).hostname); } catch {}
  $("trustHost").textContent = host;
  $("trustConfirm").hidden = false;
  $("trustYes").focus();
};
$("trustNo").onclick = () => { $("trustConfirm").hidden = true; $("trust").focus(); };
$("trustYes").onclick = async () => {
  await send({ type: "trust", url: target });
  location.replace(target);
};
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("trustConfirm").hidden) $("trustNo").click();
});

render(A.analyze(target, "", ""));
send({ type: "verdict", url: target }).then(v => { if (v) render(v); });
