# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Non-technical people (friends, family, coworkers) who the author installs or shares LinkGuard with. They browse, read webmail and chat, and click links. They will not tune settings, read scoring details, or understand terms like "punycode", "TLD" or "API key" unaided. Their job: avoid opening a scam, phishing or malware link without having to think about it, and understand a warning in a couple of seconds when one appears.

## Product Purpose
A browser extension that scores every link on a page and every URL opened from the address bar, flags risky ones in place, and stops dangerous ones before they open. It warns instead of silently removing, so people stay in control and learn what a bad link looks like. Success: a person who would have clicked a phishing link stops, understands why, and goes back.

## Positioning
Local checks run instantly in the browser and work with no account. An optional AI layer (TypeSafe's Jev, bring your own key) adds typed judgments that can only raise risk, never quietly clear a link the local checks call dangerous.

## Operating Context
- Runs inside other people's pages: in-page flags and the click warning must stay legible on any site's styles, light or dark, and never break the page.
- Address-bar navigations to dangerous URLs are redirected to a full-page block screen before the page opens (best-effort on Chromium MV3; Firefox can hold the request).
- Toolbar popup shows what was found on the current tab. Settings page is visited rarely, usually once at setup.
- Shipped to Chromium browsers (Chrome, Edge, Brave, Opera, Vivaldi), Firefox desktop, Firefox for Android, and Safari (macOS/iOS).

## Capabilities and Constraints
- Manifest V3, plain JavaScript/HTML/CSS, no build framework.
- Local heuristic analyzer (`analyzer.js`) is the baseline and must work offline.
- Optional Jev judgments from TypeSafe directly (api.typesafe.ai) with the user's own TypeSafe key, set up through a guided paste-a-key flow; optional Google Safe Browsing with the user's own key.
- Block page offers "Go back" as the primary action and a smaller one-time "Open anyway", plus "Trust this site".
- Address-bar blocking uses instant signals only: local checks, Safe Browsing, and cached Jev verdicts; Jev may also check after load and warn.
- Keys stay in `storage.local`, used only by the background script, never exposed to pages.
- Distribution: GitHub Releases plus a GitHub Pages install page (docs/), with store listings later.

## Brand Commitments
Name "LinkGuard". Drawn shield-and-tick mark (icons/icon.svg). Link marks: yellow "?" for look twice, red "!" for not safe; stamps read "Look twice" and "Not safe".

## Evidence on Hand
No store listing, screenshots, privacy policy, testimonials or usage data exist yet. Do not fabricate any.

## Product Principles
1. Warn, don't hide: the person decides, with the reasons in plain words.
2. Safe action first: the easiest, most prominent choice is always the safe one.
3. Works with zero setup: everything optional is an upgrade, never a prerequisite.
4. Plain language over precision: say "pretends to be PayPal", not "Levenshtein distance 1".
5. Never break the host page.

## Accessibility & Inclusion
Warnings must not rely on colour alone (glyph + words), must be keyboard-operable with focus moved into the dialog, and must respect reduced motion. Readable at default zoom on a phone (Firefox for Android).
