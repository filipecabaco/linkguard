// First-run page: shows what warnings look like, how to pin the extension, and walks through connecting smart checks.
const C = self.LinkGuardConnect;
const $ = id => document.getElementById(id);

function pinInstructions() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua) && /Firefox/i.test(ua)) return "Find Look Twice any time in Firefox's menu (⋮) under Extensions.";
  if (/Firefox/i.test(ua)) return "Click the puzzle-piece Extensions button at the top right, then the gear next to Look Twice, then Pin to Toolbar.";
  if (/Edg\//.test(ua)) return "Click the puzzle-piece Extensions button at the top right, then the eye icon next to Look Twice.";
  if (/Safari/i.test(ua) && !/Chrome|Chromium/i.test(ua)) return "Look Twice's shield sits next to the address bar. If it's missing, open Safari Settings, then Extensions, and tick Look Twice.";
  return "Click the puzzle-piece Extensions button at the top right, then the pin next to Look Twice.";
}
$("pinHow").textContent = pinInstructions() + " The number on it shows how many risky links a page has.";

const steps = ["s1", "s2", "s3"].map($);
const allDone = () => steps.forEach(s => s.classList.add("done"));

function say(r) {
  $("status").textContent = r.text;
  $("status").className = "status " + (r.ok ? "ok-text" : "err-text");
  if (r.ok) {
    allDone();
    $("key").value = "";
    $("endText").textContent = "All set. Smart checks are on, and you can close this tab.";
  }
}

$("openConsole").addEventListener("click", () => $("s1").classList.add("done"));
// Coming back from the console with the key copied: tick step two and put the cursor where the key goes.
window.addEventListener("focus", () => {
  if ($("s1").classList.contains("done") && !$("key").value) { $("s2").classList.add("done"); $("key").focus(); }
});

async function saveKey() {
  const key = $("key").value.trim();
  if (!key) { say({ ok: false, text: "Paste your TypeSafe key first." }); $("key").focus(); return; }
  $("saveKey").disabled = true;
  $("status").className = "status";
  $("status").textContent = "Checking the key…";
  say(await C.saveKey(key));
  $("saveKey").disabled = false;
}
$("saveKey").onclick = saveKey;
$("key").addEventListener("keydown", e => { if (e.key === "Enter") saveKey(); });

C.hasSiteAccess().then(ok => { $("access").hidden = ok; });
$("allowSites").onclick = async () => {
  if (await C.requestSiteAccess()) {
    $("access").hidden = true;
  } else {
    $("accessStatus").textContent = "Look Twice still can't see websites. Press the button again and choose Allow.";
  }
};

C.status().then(s => { if (s.on) { allDone(); say({ ok: true, text: "Connected. Smart checks are on." }); } });
if (location.hash === "#smart") $("smart").scrollIntoView();
