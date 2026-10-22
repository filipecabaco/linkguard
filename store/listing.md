# Store listing answers

Paste-ready text for each store's submission form. Images are in [`images/`](images/), regenerated with `npm run store-images`. If the product name changes, update it here, in the manifest and in the images.

Privacy policy URL (all stores): https://filipecabaco.github.io/linkguard/privacy.html
Homepage / support URL: https://filipecabaco.github.io/linkguard/ · https://github.com/filipecabaco/linkguard/issues

## Descriptions

**Short description** (Chrome summary, 132 characters max; also the manifest `description`):

> Flags scam, phishing and dangerous links on every page and stops dangerous sites before they open.

**Full description** (Chrome, Edge, AMO):

> LinkGuard checks every link on the pages you visit and marks the risky ones before you click. It also stops dangerous sites before they open, including addresses typed into the address bar. Warnings say what's wrong in plain words, and you decide.
>
> What you'll see:
> • Yellow with a dashed outline means look twice. Red with a double outline means not safe. Clicking either shows a short warning first.
> • A dangerous address opens a full-page stop instead of the site. "Go back to safety" is the big button; "Open anyway" and "I trust this site" are there when you need them.
> • The toolbar badge counts risky links, and the popup lists them with the reasons.
>
> What it looks for: look-alike brand names (paypa1, paypal.com.evil.ru), link text that shows one address but goes to another, numbers instead of site names, look-alike letters from other alphabets, scam wording, program downloads and disguised file types, hidden redirects, short links that hide where they go, and links that run code.
>
> Private by default. The built-in checks run on your device and send nothing anywhere. There's no account, no tracking and no ads.
>
> Optional extras, off unless you turn them on:
> • Smart checks with Jev by TypeSafe, using your own TypeSafe key, for links that are new or tricky.
> • Google Safe Browsing, using your own API key.
>
> Free and open source: https://github.com/filipecabaco/linkguard

**Category:** Privacy & Security where the store offers it, otherwise Tools / Productivity.

## Single purpose (Chrome)

> LinkGuard protects people from scam, phishing and malware links: it marks risky links on web pages and stops dangerous sites from opening, explaining why in plain words.

## Permission reasons

| Permission | Reason to paste |
|---|---|
| `storage` | Saves the person's settings (protection on/off, warning level, trusted sites, which optional checks are on) and, if they connect smart checks, their own API key. Nothing is stored about the pages they visit, apart from sites they chose to trust. |
| `activeTab` | Lets the toolbar popup read the address of the current tab when the person has limited LinkGuard's site access ("on click" or specific sites), so "Trust this site" and the page summary still work for the page they're looking at. |
| `webNavigation` | Address-bar protection. LinkGuard watches main-frame navigations so it can replace a dangerous page with its stop page as the navigation starts, including addresses typed into the address bar or opened from other apps. It reads only the address being opened. |
| Host permission `<all_urls>` | LinkGuard's core job is checking links on every website the person visits: the content script reads the address and visible text of each link to mark risky ones and warn before they're opened. Scams arrive on any site (webmail, social media, forums, search results), so protection limited to a list of sites would leave people exposed. Link checks run on the device. |
| Content script on `<all_urls>`, all frames | Links inside embedded frames (webmail message bodies, comment widgets) are where many phishing links appear, so those are checked too. |
| `webRequest`, `webRequestBlocking` (Firefox build only) | Lets Firefox stop a dangerous address before the request is sent, so the dangerous site never receives it. |

**Remote code (Chrome):** No, I am not using remote code. All JavaScript ships in the package. The optional smart checks call an API that returns a JSON verdict; no code is downloaded or run.

## Data disclosures

What leaves the device, and only after the person turns the feature on:

| Feature | Sent | To | When |
|---|---|---|---|
| Smart checks (Jev), off by default, needs the person's own key | Link address, visible link text, name of the site the link is on; address of a page opened from a different site | TypeSafe (api.typesafe.ai) | For each link checked, and once after such a page opens |
| Google Safe Browsing, off by default, needs the person's own key | Link addresses and addresses of pages opened | Google Safe Browsing API | For each link and page checked |

Nothing is sent to the developer. No analytics, no accounts, no servers of its own.

### Chrome Web Store, "Privacy practices" tab

Data types to tick (because the optional features send them):
- **Web history**: addresses of pages opened are checked by the optional smart checks and Safe Browsing.
- **Website content**: link text and link addresses on pages are checked by the optional smart checks.

Leave unticked: personally identifiable information, health, financial and payment, authentication, personal communications, location, user activity.

Certify all three:
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

Chrome also requires prominent disclosure and consent before sending: the welcome page and settings explain what is sent before smart checks or Safe Browsing can be turned on.

### Firefox (AMO)

Already declared in the manifest's `data_collection_permissions`: required `none`; optional `browsingActivity` and `websiteContent`. Firefox asks for consent when the person turns on smart checks. Add the privacy policy URL to the listing.

**Notes to reviewer:**

> The built-in checks work with no setup: visit any page with links, or open http://paypa1-account-verify.xyz/login to see the stop page. Smart checks (Jev) and Google Safe Browsing are optional, off by default, and need the user's own API keys, so they can't be exercised without an account. The source is unminified and identical to https://github.com/filipecabaco/linkguard at the submitted version's tag. A local test page with graded examples runs with `npm install && npm run start:testsite`.

### Edge Add-ons

Same answers as Chrome. Edge asks for the privacy policy URL because data can be sent to third parties when the optional features are on.

### Apple App Store privacy label (Safari)

Apple counts data as collected when it leaves the device, even to a service the person configured. The cautious, accurate label:
- **Browsing History**: collected, used for App Functionality, **not linked** to the person's identity, **not used for tracking**.
- Everything else: not collected.

Note in the review notes that collection only happens if the person enables smart checks or Safe Browsing with their own key. Not testable yet: the Safari build hasn't been tested.

## Images

| File | Use |
|---|---|
| `screenshot-1-marks.png` … `screenshot-5-welcome.png` (1280×800) | Chrome (up to 5), Edge, AMO |
| `promo-small-440x280.png` | Chrome small promo tile, Edge small promo tile |
| `promo-marquee-1400x560.png` | Chrome marquee (optional, used if featured) |
| `logo-300x300.png` | Edge store logo |
| `icons/icon-128.png` (repo root) | Chrome and AMO icon |

Apple needs its own Mac and iPhone screenshots from the Safari build, once that's tested.
