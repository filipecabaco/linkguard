// Every link on the test site, with the level LinkGuard should give it at the default threshold.
// test/unit/cases.test.js holds these to the analyzer, so the site's answers never drift from the real checks.
// Links on *.localhost and 127.0.0.1 really open (the test server answers them); the rest only need to be judged.

function cases(port) {
  const local = (sub, path) => `http://${sub}.localhost:${port}${path}`;
  const ip = path => `http://127.0.0.1:${port}${path}`;

  const posts = [
    { who: "Rosa M.", when: "8 min ago", before: "Good explainer if your parents keep getting those texts:", href: "https://en.wikipedia.org/wiki/Phishing", text: "Wikipedia: Phishing", expect: "safe", check: "Known safe site" },
    { who: "Building office", when: "21 min ago", before: "Parcel lockers are full again. If DHL says your delivery failed, reschedule here:", href: local("dhl-redelivery-confirm", "/track"), text: "Reschedule your DHL delivery", expect: "dangerous", check: "Brand name on someone else's site (opens a fake page)" },
    { who: "Tom", when: "40 min ago", before: "Anyone else get this? Says my account is limited.", href: "http://paypa1-account-verify.xyz/login", text: "www.paypal.com", expect: "dangerous", check: "Look-alike spelling + text shows a different site" },
    { who: "Priya", when: "1 h ago", before: "The school uses this for the parent portal:", href: "https://login.microsoftonline.com/", text: "Microsoft sign-in", expect: "safe", check: "Real sign-in page of a known brand" },
    { who: "Unknown sender", when: "1 h ago", before: "Congratulations neighbour!", href: "https://bit.ly/free-gift-card", text: "Claim your free gift card", expect: "suspicious", check: "Short link + scam wording" },
    { who: "Dan", when: "2 h ago", before: "Our accountant sent this, but my email flagged it:", href: "https://example.com/invoice.pdf.exe", text: "Download your invoice", expect: "dangerous", check: "Program disguised as a document" },
    { who: "Lena", when: "2 h ago", before: "Ordering the bulk pasta from here again:", href: "https://www.amazon.de/", text: "amazon.de", expect: "safe", check: "Brand's own country site" },
    { who: "Marco", when: "3 h ago", before: "Got a text that my order is on hold:", href: local("amaz0n-account", "/"), text: "Your Amazon order is on hold", expect: "dangerous", check: "Zero instead of an o (opens a fake page)" },
    { who: "Sam", when: "3 h ago", before: "Saw this in the comments of the group chat:", href: "https://paypalsecure-login.com/", text: "PayPal secure login", expect: "suspicious", check: "Brand glued to other words" },
    { who: "Jo", when: "4 h ago", before: "Birthday dinner on Friday, booked here:", href: "https://www.applebees.com/", text: "Applebee's", expect: "safe", check: "Starts like a brand (Apple) but isn't pretending" },
    { who: "Ines", when: "4 h ago", before: "Bank wants me to check something:", href: "https://secure-banking.example.net/", text: "https://www.chase.com", expect: "dangerous", check: "Link text names a different site" },
    { who: "Neighbourhood watch", when: "5 h ago", before: "The new cameras are set up. Admin page for the committee:", href: ip("/router"), text: "Camera admin", expect: "suspicious", check: "Number instead of a site name (opens a fake page)" },
    { who: "Kai", when: "5 h ago", before: "Is this real? It looks exactly like PayPal:", href: "https://pаypal.com/signin", text: "Sign in to PayPal", expect: "suspicious", check: "Letter from another alphabet (Cyrillic а)" },
    { who: "Ana", when: "6 h ago", before: "Netflix says my card expired:", href: "https://netflx.com/account", text: "Update your payment", expect: "suspicious", check: "One letter off a brand" },
    { who: "Ben", when: "7 h ago", before: "Recipe from the potluck, via a Google link:", href: "https://www.google.com/url?q=https://www.example.com/recipes", text: "example.com/recipes", expect: "safe", check: "Redirect that goes where the text says" },
    { who: "Unknown sender", when: "8 h ago", before: "Account alert from your bank:", href: "http://accounts.google.com@203.0.113.9/signin", text: "accounts.google.com", expect: "dangerous", check: "Real address hidden behind an @ sign" },
    { who: "Lucy", when: "9 h ago", before: "PayPal emailed me this, should I worry?", href: "https://paypal.com.verify-account.ru/", text: "Verify your PayPal account", expect: "dangerous", check: "Brand name padded in front of another site" },
    { who: "Raj", when: "10 h ago", before: "Printer in the laundry room needs this driver:", href: "https://example.com/setup.msi", text: "Printer driver", expect: "suspicious", check: "Downloads a program" },
    { who: "Unknown sender", when: "11 h ago", before: "Limited spots left!", href: "https://crypto-double.win/airdrop", text: "Double your crypto", expect: "suspicious", check: "Scam ending (.win) + scam wording" },
    { who: "Eva", when: "12 h ago", before: "Shared the minutes from the meeting:", href: "https://dropbx.com/s/report.zip", text: "Meeting minutes", expect: "dangerous", check: "One letter off a brand + compressed file" },
    { who: "Unknown sender", when: "1 day ago", before: "You've been selected!", href: "javascript:alert('LinkGuard test: this link ran code')", text: "Show my prize", expect: "dangerous", check: "Runs code instead of opening a page" },
    { who: "Building office", when: "1 day ago", before: "Security update for residents:", href: ip("/paypal/verify.exe"), text: "PayPal security tool", expect: "dangerous", check: "Program download on a bare number (opens a fake page)" },
    { who: "Unknown sender", when: "1 day ago", before: "See the shared file:", href: "data:text/html,<h1>Fake sign-in</h1>", text: "Open the shared document", expect: "dangerous", check: "Hidden content instead of a website" },
    { who: "Nora", when: "1 day ago", before: "Docs for the coding club:", href: "https://nodejs.org/", text: "Node.js", expect: "safe", check: "Text that looks like an address but is a name" }
  ];

  // Added after the page loads, to check that LinkGuard catches links that appear later.
  const later = [
    { who: "Tom", when: "just now", before: "Sorry, wrong link before. This is the real one:", href: local("paypal-secure-login", "/signin"), text: "Confirm your PayPal details", expect: "dangerous", check: "Added after load (opens a fake page)" },
    { who: "Lena", when: "just now", before: "Delivery tracking for the pasta:", href: "https://www.dhl.de/en/privatkunden.html", text: "DHL Germany", expect: "safe", check: "Added after load, brand's own site" }
  ];

  // Starts harmless, then the page swaps the address: the classic bait and switch.
  const swap = { who: "Unknown sender", when: "2 days ago", before: "Coupons for the corner shop:", href: "https://www.example.com/coupons", swapTo: local("paypal-secure-login", "/signin"), text: "Corner shop coupons", expect: "dangerous", check: "Address changes after the page loads" };

  // For typing or pasting into the address bar: the full-page stop, not the in-page warning.
  const addressBar = [
    { href: local("paypal-secure-login", "/signin"), expect: "dangerous" },
    { href: local("amaz0n-account", "/"), expect: "dangerous" },
    { href: ip("/paypal/verify.exe"), expect: "dangerous" },
    { href: `http://localhost:${port}/`, expect: "safe" }
  ];

  // Smart checks (Jev): links the built-in checks call safe, so a mark can only come from Jev.
  // expect "flag": an obvious scam to a person that Jev should catch. "safe": an ordinary link Jev should leave alone.
  const smart = [
    { who: "Unknown sender", when: "5 min ago", before: "Final notice from the tax office:", href: "https://irs-tax-refund-claim.com/", text: "Claim your $1,240 tax refund", expect: "flag", check: "Tax refund scam" },
    { who: "Unknown sender", when: "12 min ago", before: "Your parcel is waiting:", href: "https://royalmail-redelivery-fee.com/pay", text: "Pay the £1.99 redelivery fee", expect: "flag", check: "Parcel fee scam (Royal Mail isn't a built-in brand)" },
    { who: "Unknown sender", when: "30 min ago", before: "Security alert:", href: "https://chase-online-alerts.net/", text: "Unusual sign-in on your Chase account", expect: "flag", check: "Bank phishing (Chase isn't a built-in brand)" },
    { who: "Unknown sender", when: "45 min ago", before: "Delivery problem:", href: "https://usps-tracking-redirect.info/", text: "USPS: your package is held, confirm your address", expect: "flag", check: "Parcel phishing" },
    { who: "Unknown sender", when: "1 h ago", before: "WARNING", href: "https://windows-defender-alert.support/", text: "Your PC is infected. Call support now", expect: "flag", check: "Tech-support scam" },
    { who: "Crypto Club", when: "1 h ago", before: "Live now!", href: "https://elon-btc-event.live/", text: "Elon is sending 2x back on all BTC today", expect: "flag", check: "Crypto giveaway scam" },
    { who: "Unknown sender", when: "2 h ago", before: "Summer clearance:", href: "https://rayban-outlet-sale.shop/", text: "Ray-Ban sunglasses, 90% off", expect: "flag", check: "Fake shop" },
    { who: "Unknown sender", when: "2 h ago", before: "Refund available:", href: "https://hmrc-refunds.co/", text: "HMRC owes you a refund", expect: "flag", check: "Government refund scam" },
    { who: "Unknown sender", when: "3 h ago", before: "Claim before midnight:", href: local("tax-refund-claim", "/"), text: "Claim your tax refund", expect: "flag", check: "Opens a fake page; Jev should replace it with the stop page" },
    { who: "Rosa M.", when: "3 h ago", before: "For anyone confused by the new tax code:", href: "https://www.gov.uk/check-income-tax", text: "Check your income tax on GOV.UK", expect: "safe", check: "Real government site" },
    { who: "Priya", when: "4 h ago", before: "Morning headlines:", href: "https://www.bbc.co.uk/news", text: "BBC News", expect: "safe", check: "Well-known news site" },
    { who: "Jo", when: "4 h ago", before: "New croissants this week!", href: "https://maplestreet-bakery.com/menu", text: "Bakery menu", expect: "safe", check: "Small local business" }
  ];

  // Pass the built-in checks, so they open; with smart checks on, the stop page should replace them a moment later.
  const smartAddressBar = [
    { href: local("tax-refund-claim", "/"), expect: "flag" },
    { href: local("chase-alerts", "/"), expect: "flag" }
  ];

  return { posts, later, swap, addressBar, smart, smartAddressBar };
}

module.exports = { cases };
