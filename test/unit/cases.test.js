// The test site shows an expected answer next to every link; keep those answers true to the analyzer.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const A = require("../../analyzer.js");
const { cases } = require("../manual/cases");

const { posts, later, swap, addressBar, smart, smartAddressBar } = cases(8080);

// A smart-check case the built-in checks already flag wouldn't show whether Jev did anything.
for (const c of [...smart, ...smartAddressBar]) {
  test(`test site smart check: ${c.href} passes the built-in checks`, () => {
    assert.equal(A.analyze(c.href, c.text || "", c.text ? "localhost" : "").level, "safe");
  });
}

for (const c of [...posts, ...later, { ...swap, href: swap.swapTo }]) {
  test(`test site: ${c.text} is ${c.expect}`, () => {
    assert.equal(A.analyze(c.href, c.text, "localhost").level, c.expect, c.href);
  });
}

for (const c of addressBar) {
  test(`test site address bar: ${c.href} is ${c.expect}`, () => {
    assert.equal(A.analyze(c.href, "", "").level, c.expect);
  });
}
