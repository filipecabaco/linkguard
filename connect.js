// Shared by welcome and settings pages: connecting smart checks (Jev) and asking for data consent.
self.LinkGuardConnect = (() => {
  const send = msg => new Promise(res => chrome.runtime.sendMessage(msg, r => res(chrome.runtime.lastError ? null : r)));

  // Firefox shows its own consent prompt for sending browsing data; other browsers reject the key, which we ignore.
  async function requestConsent() {
    try { return await chrome.permissions.request({ data_collection: ["browsingActivity", "websiteContent"] }); }
    catch { return true; }
  }

  function describeTest(t) {
    if (!t) return { ok: false, text: "Couldn't reach Look Twice. Reload this page and try again." };
    if (t.ok) return { ok: true, text: "Connected. Smart checks are on." };
    if (t.status === 401 || t.status === 403) return { ok: false, text: "TypeSafe didn't accept that key. Copy it again from the TypeSafe console and paste the whole thing." };
    if (t.status === 402) return { ok: false, text: "Your TypeSafe account has run out of credit. Top it up in the TypeSafe console, then try again." };
    return { ok: false, text: t.error || "Something went wrong. Try again." };
  }

  async function status() {
    const local = await chrome.storage.local.get({ jevKey: "", jevProvider: "typesafe", jevLastError: "" });
    const sync = await chrome.storage.sync.get({ useJev: false });
    return { connected: Boolean(local.jevKey), on: sync.useJev && Boolean(local.jevKey), provider: local.jevProvider, lastError: local.jevLastError };
  }

  // Firefox lets people withhold "access to all websites"; without it Look Twice can't see links. Chrome grants it at install.
  const ALL_SITES = { origins: ["<all_urls>"] };
  const hasSiteAccess = async () => { try { return await chrome.permissions.contains(ALL_SITES); } catch { return true; } };
  const requestSiteAccess = async () => { try { return await chrome.permissions.request(ALL_SITES); } catch { return false; } };

  return {
    hasSiteAccess,
    requestSiteAccess,
    requestConsent,
    status,
    // Saves the key, then proves it with one real check; a key that fails leaves smart checks off.
    saveKey: async key => {
      if (!(await requestConsent())) return { ok: false, text: "Look Twice needs your permission to send links for smart checks." };
      // Talking to TypeSafe from the extension needs site access too (Firefox can withhold it).
      if (!(await hasSiteAccess()) && !(await requestSiteAccess())) return { ok: false, text: "Look Twice needs permission to reach TypeSafe. Press the button again and choose Allow." };
      await chrome.storage.local.set({ jevKey: key.trim(), jevProvider: "typesafe", jevModel: "" });
      await chrome.storage.sync.set({ useJev: true });
      const r = describeTest(await send({ type: "jevTest" }));
      if (!r.ok) await chrome.storage.sync.set({ useJev: false });
      return r;
    },
    test: async () => describeTest(await send({ type: "jevTest" })),
    disconnect: () => send({ type: "jevDisconnect" })
  };
})();
