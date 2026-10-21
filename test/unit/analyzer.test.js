const { test } = require("node:test");
const assert = require("node:assert/strict");
const A = require("../../analyzer.js");

const level = (url, text = "", page = "example.com") => A.analyze(url, text, page).level;

// Real sites and everyday links that must never be flagged. Each one was a false positive at some point.
const SAFE = [
  ["https://login.microsoftonline.com/", "Sign in"],
  ["https://s3.amazonaws.com/bucket/file", "download"],
  ["https://lh3.googleusercontent.com/a.png", "image"],
  ["https://www.amazon.de/", "Amazon"],
  ["https://www.google.co.uk/", "Google"],
  ["https://startups.com/", "Startups"],
  ["https://www.pineapple.com/", ""],
  ["https://www.applebees.com/", ""],
  ["https://nodejs.org/", "Node.js"],
  ["https://github.com/x/y/blob/main/README.md", "README.md"],
  ["https://www.google.com/url?q=https://example.com/", "www.example.com"],
  ["https://accounts.google.com/signin", "Sign in"],
  ["https://example.com/about", "About us"],
  ["mailto:someone@example.com", "Email us"],
  ["#top", "Back to top"]
];

const DANGEROUS = [
  ["http://paypa1-account-verify.xyz/login", "www.paypal.com"],
  ["https://paypal.com.verify-account.ru/", "PayPal"],
  ["javascript:alert(1)", "Click"],
  ["https://example.com/invoice.pdf.exe", "Invoice"],
  ["https://evil.example/login", "www.mybank.com"]
];

const SUSPICIOUS = [
  ["https://paypalsecure-login.com/", ""],
  ["https://bit.ly/free-gift-card", "Claim your gift"],
  ["http://192.168.4.20/paypal/login", "Log in"]
];

for (const [url, text] of SAFE) test(`safe: ${url}`, () => assert.equal(level(url, text), "safe"));
for (const [url, text] of DANGEROUS) test(`dangerous: ${url}`, () => assert.equal(level(url, text), "dangerous"));
for (const [url, text] of SUSPICIOUS) test(`suspicious: ${url}`, () => assert.equal(level(url, text), "suspicious"));

test("brand impersonation wins the headline and names the brand", () => {
  const r = A.analyze("http://paypa1-account-verify.xyz/login", "www.paypal.com", "example.com");
  assert.equal(r.headline, "This link is pretending to be PayPal");
  assert.equal(r.kind, "brand");
  assert.equal(r.brand, "PayPal");
});

test("reasons are plain language", () => {
  const r = A.analyze("https://paypal.com.verify-account.ru/", "", "example.com");
  assert.ok(r.reasons.includes("Uses the name PayPal but isn't PayPal's real website"));
});

test("trusted-site matching respects the dot boundary", () => {
  assert.equal(A.sameOrSub("www.paypal.com", "paypal.com"), true);
  assert.equal(A.sameOrSub("paypal.com", "paypal.com"), true);
  assert.equal(A.sameOrSub("evilpaypal.com", "paypal.com"), false);
});

test("registrable domain handles two-level country endings", () => {
  assert.equal(A.registrable("www.amazon.co.uk"), "amazon.co.uk");
  assert.equal(A.registrable("a.b.example.com"), "example.com");
});
