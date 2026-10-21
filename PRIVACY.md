# LinkGuard privacy policy

LinkGuard checks links in your browser to warn you about scams, phishing and dangerous downloads.

## What stays on your device

By default, everything. LinkGuard's built-in checks run entirely inside your browser and send nothing anywhere. Your settings and trusted sites are stored by your browser. If your browser syncs extension settings, they sync with your own browser account; keys never do.

## What is sent, and only if you turn it on

**Smart checks (Jev).** If you connect smart checks, LinkGuard sends, for each link it checks:
- the link's address,
- the visible words of the link,
- the name of the website you're on.

These go directly to TypeSafe's Jev model (api.typesafe.ai). They're used only to judge whether the link is safe. LinkGuard sends nothing else from the page: no page content, passwords, form data or cookies.

**Google Safe Browsing.** If you turn it on, LinkGuard sends link addresses to Google's Safe Browsing service to check them against Google's list of dangerous sites.

You can turn either off at any time in LinkGuard's settings. Disconnecting smart checks deletes the stored key.

## What LinkGuard never does

- It doesn't sell, share or use your data for advertising.
- It doesn't collect analytics, and it has no servers of its own.
- It doesn't send anything to its author.

## Keys

API keys you connect are stored only in your browser's local extension storage. They're used only by LinkGuard's background process to talk to the service you chose, and are never exposed to websites.

## Third-party services

When enabled, each service's own policy applies:
- [TypeSafe](https://typesafe.ai)
- [Google Safe Browsing](https://policies.google.com/privacy)

## Contact

Questions: open an issue in the project's repository.
