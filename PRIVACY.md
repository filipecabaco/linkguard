# Look Twice privacy policy

Last updated 22 October 2026. Published at https://filipecabaco.github.io/look-twice/privacy.html (docs/privacy.html); keep the two in step.

Look Twice checks links in your browser to warn you about scams, phishing and dangerous downloads.

## What stays on your device

By default, everything. Look Twice's built-in checks run entirely inside your browser and send nothing anywhere. Your settings and trusted sites are stored by your browser. If your browser syncs extension settings, they sync with your own browser account; keys never do.

## What is sent, and only if you turn it on

**Smart checks (Jev).** If you connect smart checks, Look Twice sends, for each link it checks:
- the link's address,
- the visible words of the link,
- the name of the website you're on.

It also sends the address of a page you open from a different site, to check it again once it has opened. Nothing else is sent for those pages.

These go directly to TypeSafe's Jev model (api.typesafe.ai). They're used only to judge whether the link is safe. Look Twice sends nothing else from the page: no page content, passwords, form data or cookies.

**Google Safe Browsing.** If you turn it on, Look Twice sends link addresses, and the addresses of pages you open, to Google's Safe Browsing service to check them against Google's list of dangerous sites.

You can turn either off at any time in Look Twice's settings. Disconnecting smart checks deletes the stored key.

## What Look Twice never does

- It doesn't sell, share or use your data for advertising.
- It doesn't collect analytics, and it has no servers of its own.
- It doesn't send anything to its author.

## Keys

API keys you connect are stored only in your browser's local extension storage. They're used only by Look Twice's background process to talk to the service you chose, and are never exposed to websites.

## Third-party services

When enabled, each service's own policy applies:
- [TypeSafe](https://typesafe.ai)
- [Google Safe Browsing](https://policies.google.com/privacy)

## Contact

Questions: open an issue at https://github.com/filipecabaco/look-twice/issues.
