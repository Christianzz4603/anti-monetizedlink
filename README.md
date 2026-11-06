# No Adlink

A single-file userscript for Firefox + Tampermonkey and compatible userscript managers.

## Features in 0.2.0

- **Page-level ad cleanup:** hides/removes a conservative set of common ad containers and known ad-network frames.
- **Popup guard:** blocks script-created windows unless the browser reports an active user gesture.
- **Shortlink destination preview:** recognizes common URL parameters and a base64 URL in the `r` parameter, then asks before opening.
- **Floating settings panel:** toggle each feature on a page; settings are stored locally.
- **No external bypass API:** the current page URL is not sent to a third-party resolver service.

## Install in Firefox

1. Install Tampermonkey (or another compatible userscript manager) in Firefox.
2. Open `src/no-adlink.user.js` on GitHub.
3. Open the **Raw** version and install it in the userscript manager.
4. Visit a page and use the **NL** button in the bottom-right corner to configure features.

## Important limitations

This is a userscript, not a full WebExtension. A userscript cannot reliably block network requests before they happen, filter every ad script, or control all browser-level redirects. The cosmetic filter only hides/removes selected page elements. For real network-level ad blocking in Firefox, use a dedicated content-blocking extension such as uBlock Origin alongside this script.

Popup protection is best-effort: Firefox's built-in popup protection remains important, and sites may use navigation techniques other than `window.open()`.

Shortlink handling is intentionally conservative. It only unwraps transparent URL parameters and previews the result. It does not defeat CAPTCHAs, authentication, license checks, paid access, or server-side verification. Some ad-shortener flows require site-specific handling and cannot be safely generalized.

## Project structure

```
no-adlink-userscript/
├── README.md
├── LICENSE
└── src/
    └── no-adlink.user.js
```

## Development notes

The supplied reference scripts cover different mechanisms and have different licenses and trust assumptions. This project implements its own small core rather than pasting entire third-party scripts or silently calling unrelated bypass APIs. Add host-specific resolvers as isolated, reviewed modules with test URLs and expected results.
