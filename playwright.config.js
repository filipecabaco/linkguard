// End-to-end tests load dist/chrome into Playwright's Chromium. Run with: npm run test:e2e
module.exports = { testDir: "test/e2e", timeout: 30_000, workers: 1, reporter: "list" };
