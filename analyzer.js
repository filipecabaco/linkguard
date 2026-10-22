// Look Twice analyzer: local heuristic scoring of URLs. No network calls.
// Reasons are written for non-technical people: say what the link does, not how we detected it.
(function (root) {
  // name: how people know the brand. domains: sites it really owns. cc: also owns brand.<country> (amazon.de, google.fr).
  const BRANDS = {
    paypal: { name: "PayPal", domains: ["paypal.com", "paypal.me", "paypalobjects.com"] },
    google: { name: "Google", cc: true, domains: ["google.com", "youtube.com", "youtu.be", "gmail.com", "googleusercontent.com", "googleapis.com", "gstatic.com", "googlevideo.com", "ytimg.com", "googletagmanager.com", "google-analytics.com", "withgoogle.com", "blogger.com", "goo.gl", "g.co"] },
    apple: { name: "Apple", cc: true, domains: ["apple.com", "icloud.com", "mzstatic.com", "apple.news", "cdn-apple.com", "icloud-content.com"] },
    microsoft: { name: "Microsoft", domains: ["microsoft.com", "live.com", "outlook.com", "office.com", "microsoftonline.com", "microsoft365.com", "office365.com", "windows.net", "windows.com", "azure.com", "azureedge.net", "bing.com", "msn.com", "sharepoint.com", "onedrive.com", "skype.com", "xbox.com", "visualstudio.com", "aka.ms"] },
    amazon: { name: "Amazon", cc: true, domains: ["amazon.com", "amazonaws.com", "amazon-adsystem.com", "media-amazon.com", "ssl-images-amazon.com", "amazontrust.com", "aboutamazon.com", "primevideo.com", "amzn.to", "a.co"] },
    facebook: { name: "Facebook", domains: ["facebook.com", "fb.com", "fb.me", "facebook.net", "fbcdn.net", "meta.com", "messenger.com"] },
    instagram: { name: "Instagram", domains: ["instagram.com", "cdninstagram.com"] },
    netflix: { name: "Netflix", domains: ["netflix.com", "netflix.net", "nflxext.com", "nflximg.net", "nflxvideo.net"] },
    whatsapp: { name: "WhatsApp", domains: ["whatsapp.com", "whatsapp.net", "wa.me"] },
    binance: { name: "Binance", domains: ["binance.com", "binance.us"] },
    coinbase: { name: "Coinbase", domains: ["coinbase.com"] },
    metamask: { name: "MetaMask", domains: ["metamask.io"] },
    dhl: { name: "DHL", cc: true, domains: ["dhl.com"] },
    fedex: { name: "FedEx", domains: ["fedex.com"] },
    ups: { name: "UPS", domains: ["ups.com"] },
    steam: { name: "Steam", domains: ["steampowered.com", "steamcommunity.com", "steamstatic.com", "steamusercontent.com"] },
    linkedin: { name: "LinkedIn", domains: ["linkedin.com", "licdn.com", "lnkd.in"] },
    ebay: { name: "eBay", cc: true, domains: ["ebay.com", "ebayimg.com", "ebaystatic.com"] },
    dropbox: { name: "Dropbox", domains: ["dropbox.com", "dropboxusercontent.com", "dropboxapi.com", "db.tt"] },
    docusign: { name: "DocuSign", domains: ["docusign.com", "docusign.net"] }
  };
  const SUSPICIOUS_TLDS = ["zip","mov","xyz","top","click","gq","ml","cf","tk","ga","work","rest","cam","country","kim","loan","men","party","review","stream","download","racing","win","bid","icu","buzz","monster","sbs","cfd"];
  const SHORTENERS = ["bit.ly","tinyurl.com","t.co","goo.gl","ow.ly","is.gd","buff.ly","cutt.ly","rebrand.ly","shorturl.at","rb.gy","tiny.cc","s.id","v.gd"];
  // Endings that are file names or tech names far more often than websites ("Node.js", "README.md").
  const NOT_A_SITE = ["js","md","ts","py","rb","sh","txt","pdf","html","htm","css","json","xml","yml","yaml","png","jpg","jpeg","gif","svg","doc","docx","exe","php"];
  const DANGEROUS_EXT = /\.(exe|scr|msi|bat|cmd|com|pif|vbs|vbe|js|jse|wsf|hta|ps1|jar|apk|dmg|pkg|iso|img|lnk|reg)(\?|#|$)/i;
  const ARCHIVE_EXT = /\.(zip|rar|7z|tar|gz)(\?|#|$)/i;
  const SPAM_WORDS = /(free[-_]?gift|you[-_]?won|winner|prize|claim[-_]?now|bonus|giveaway|airdrop|casino|viagra|cialis|loan|crypto[-_]?double|earn[-_]?money|hot[-_]?singles|limited[-_]?offer)/i;
  const PHISH_WORDS = /(login|log-in|signin|sign-in|verify|verification|account|secure|update|confirm|banking|wallet|password|unlock|suspended|recover)/i;

  const LEET = { "0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

  function registrable(host) {
    const p = host.split(".");
    if (p.length <= 2) return host;
    const sld = p[p.length - 2];
    if (["co", "com", "org", "net", "gov", "ac", "edu"].includes(sld) && p[p.length - 1].length === 2)
      return p.slice(-3).join(".");
    return p.slice(-2).join(".");
  }

  // Same site or a subdomain of it, never a lookalike suffix ("evilpaypal.com" is not "paypal.com").
  function sameOrSub(host, domain) {
    return host === domain || host.endsWith("." + domain);
  }

  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }

  function isOfficial(host, brand, b) {
    if (b.domains.some(d => sameOrSub(host, d))) return true;
    if (!b.cc) return false;
    const reg = registrable(host);
    const [label, ...rest] = reg.split(".");
    const tld = rest[rest.length - 1];
    return label === brand && tld.length === 2 && !SUSPICIOUS_TLDS.includes(tld);
  }

  function officialForAny(host) {
    return Object.entries(BRANDS).some(([brand, b]) => isOfficial(host, brand, b));
  }

  function analyze(href, linkText, pageHost) {
    const reasons = [];
    let score = 0;
    let u = null;
    let headline = "";
    let headPts = 0;
    let kind = "";
    let brandName = null;
    // head/k name the headline and kind of risk; brand impersonation outranks other headlines.
    const found = [];
    const add = (pts, why, head, k) => {
      score += pts; found.push([pts, why]);
      const prio = k === "brand" ? pts + 100 : pts;
      if (head && prio > headPts) { headline = head; kind = k || ""; headPts = prio; }
    };

    const raw = (href || "").trim();
    if (/^javascript:/i.test(raw)) { add(70, "Runs code instead of opening a page", "This link runs hidden code", "code"); return finish(); }
    if (/^data:/i.test(raw)) { add(70, "Opens hidden content instead of a real website", "This link opens a fake page", "code"); return finish(); }
    if (/^vbscript:/i.test(raw)) { add(90, "Runs code instead of opening a page", "This link runs hidden code", "code"); return finish(); }

    try { u = new URL(raw, root.location ? root.location.href : undefined); } catch { return { score: 0, level: "safe", reasons, headline }; }
    if (!/^https?:$/.test(u.protocol)) return { score: 0, level: "safe", reasons, headline };

    const host = u.hostname.toLowerCase();
    const reg = registrable(host);
    const label = reg.split(".")[0];
    const tld = host.split(".").pop();
    const full = u.href;
    const tokens = host.split(/[.-]/).filter(Boolean);
    const official = officialForAny(host);

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[")) add(35, "Uses a number instead of a website name", "This link hides which website it is", "hidden");
    if (host.includes("xn--")) add(35, "Uses look-alike letters from another alphabet in the address", "This link uses a look-alike address", "lookalike");
    if (SUSPICIOUS_TLDS.includes(tld)) add(20, `The address ends in .${tld}, an ending scammers use a lot`);
    if (host.split(".").length > 4) add(15, "The address is padded with extra parts to hide the real site");
    if (u.username || u.password || /@/.test(raw.split("?")[0].replace(/^https?:\/\//i, "").split("/")[0]))
      add(40, "Hides the real address behind an @ sign", "This link hides where it really goes", "hidden");
    if (u.port && !["80", "443"].includes(u.port)) add(15, `Connects in an unusual way (port ${u.port})`);
    if (SHORTENERS.includes(reg) || SHORTENERS.includes(host)) add(20, "A short link that hides where it really goes");
    if ((host.replace(/xn--/g, "").match(/-/g) || []).length >= 3) add(10, "The site name is stuffed with dashes");
    if (full.length > 200) add(10, "An unusually long address");
    if ((full.match(/%[0-9a-f]{2}/gi) || []).length > 10) add(10, "Parts of the address are scrambled");
    if (u.protocol === "http:" && PHISH_WORDS.test(u.pathname + host)) add(20, "Asks you to log in without a private connection");

    // Brand impersonation: a brand's name on a site the brand doesn't own.
    if (!official) {
      for (const [brand, b] of Object.entries(BRANDS)) {
        if (tokens.includes(brand)) {
          add(45, `Uses the name ${b.name} but isn't ${b.name}'s real website`, `This link is pretending to be ${b.name}`, "brand");
          brandName = b.name; break;
        }
        const deLeet = label.replace(/[013457@$]/g, c => LEET[c]);
        if (deLeet !== label && deLeet.includes(brand)) {
          add(55, `Spells ${b.name} with look-alike characters ("${label}")`, `This link is pretending to be ${b.name}`, "brand");
          brandName = b.name; break;
        }
        if (brand.length >= 5 && label.length >= 4 && lev(label, brand) === 1) {
          add(50, `"${label}" is one letter off ${b.name}`, `This link is pretending to be ${b.name}`, "brand");
          brandName = b.name; break;
        }
        // Weaker: brand glued to other words ("paypalsecure"). Alone it isn't enough to flag ("applebees").
        if (brand.length >= 5 && tokens.some(t => t !== brand && t.startsWith(brand))) {
          add(25, `Starts with the name ${b.name} but isn't ${b.name}'s real website`, `This link may be pretending to be ${b.name}`, "brand");
          brandName = b.name; break;
        }
      }
      if (PHISH_WORDS.test(host)) add(15, "The site name has words like \"login\" or \"verify\" in it");
    }

    if (SPAM_WORDS.test(full)) add(25, "Uses typical scam wording (prizes, free gifts, crypto)", "This link looks like a scam", "scam");
    if (DANGEROUS_EXT.test(u.pathname)) add(45, "Downloads a program that could install something on your device", "This link downloads a program", "download");
    else if (ARCHIVE_EXT.test(u.pathname)) add(10, "Downloads a compressed file");
    if (/\.(pdf|doc|docx|jpg|png|txt)\.(exe|scr|js|vbs|bat|cmd)/i.test(u.pathname))
      add(50, "Disguises a program as a document", "This link downloads a disguised program", "download");

    // Open redirect: a full URL inside the query sends you on somewhere else.
    const redirects = [];
    for (const v of u.searchParams.values()) {
      if (/^(https?:)?\/\//i.test(v) || /^https?%3A/i.test(v)) {
        try {
          const inner = new URL(decodeURIComponent(v).replace(/^\/\//, "https://"));
          redirects.push(registrable(inner.hostname));
          if (registrable(inner.hostname) !== reg) { add(15, `Sends you on to a different site (${inner.hostname})`); break; }
        } catch {}
      }
    }

    // Visible text names a different site than the real destination.
    if (linkText) {
      const text = linkText.trim();
      const m = text.match(/(https?:\/\/)?(www\.)?((?:[a-z0-9-]+\.)+([a-z]{2,}))/i);
      if (m) {
        const explicit = Boolean(m[1] || m[2]);
        const shownHost = m[3].toLowerCase();
        const shown = registrable(shownHost);
        // Pages split link text across elements and textContent glues the pieces ("20261021.pdf" + "Preview"),
        // so a bare name only counts as a site if its ending is cased like one (com, COM, Com), not "pdfPreview".
        const end = m[4];
        const casedLikeSite = end === end.toLowerCase() || end === end.toUpperCase() || /^[A-Z][a-z]{1,2}$/.test(end);
        const looksLikeSite = explicit || (casedLikeSite && !NOT_A_SITE.includes(end.toLowerCase()));
        if (looksLikeSite && shown !== reg && !sameOrSub(host, shown) && !redirects.includes(shown))
          add(60, `The link says ${m[0]} but goes to ${host}`, "This link isn't going where it says", "mismatch");
      }
    }

    return finish();

    function finish() {
      score = Math.min(score, 100);
      // Strongest reason first: warnings show only the top three.
      reasons.push(...found.sort((a, b) => b[0] - a[0]).map(r => r[1]));
      const level = score >= 60 ? "dangerous" : score >= 30 ? "suspicious" : "safe";
      if (!headline && level !== "safe") headline = level === "dangerous" ? "This link looks dangerous" : "This link looks suspicious";
      return { score, level, reasons, headline, kind, brand: brandName, host: u ? u.hostname : "" };
    }
  }

  root.LinkGuardAnalyzer = { analyze, registrable, sameOrSub, isKnownSite: officialForAny };
  if (typeof module !== "undefined") module.exports = root.LinkGuardAnalyzer;
})(typeof self !== "undefined" ? self : globalThis);
