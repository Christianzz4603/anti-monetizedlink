# Anti Monetized Link

A single-link Tampermonkey userscript for Firefox and compatible userscript managers.

## v0.3.1

- Remote update and download metadata for automatic script updates.
- Separate domain registry for known monetized shortlink services.
- Generic transparent URL extraction from common redirect parameters and Base64 wrappers.
- Initial host-specific extraction for LinkVIP/Blitly URL wrappers, L4S encoded paths, and plain-URL Pastebin raw pages.
- On recognized adlink hosts, presents visible outbound page links as choices instead of blindly redirecting.
- Adds an isolated Work.ink resolver that reads visible outbound links and destination data attributes for user review.
- Fixes outbound-link filtering so it checks each candidate destination host, not the current page host.
- Cosmetic ad-element cleanup, popup guard, and a floating settings panel.
- No third-party bypass API receives the user's current URL.

## Install

Import this raw userscript URL in Tampermonkey:

`https://raw.githubusercontent.com/Christianzz4603/no-adlink-userscript/main/src/no-adlink.user.js`

The script uses a small companion registry loaded with `@require`; both files are hosted in this repository.

## Work.ink source review

The Greasy Fork script [Work.ink bypass by kxBypass](https://greasyfork.org/en/scripts/554796-work-ink-bypass-by-kxbypass/code) was reviewed as a behavioral reference. Its listing declares no license, so its source code was not copied. Anti Monetized Link uses an independent, read-only resolver: it surfaces visible destination candidates for manual review and does not auto-click skip/offer controls, rewrite page contents, spoof ad-related fetches, or remove access offers.

## Important limits

The supplied domain file contains three different categories: 54 known monetized services, 128 additional domains from public bypass lists, and 1,454 general shortener domains. General shorteners are not necessarily ad-supported, and a domain match is not proof that a resolver exists. The initial registry focuses on known monetized services; suspicious adult-content domains are deliberately not treated as destinations to resolve.

A userscript cannot provide reliable browser-level network filtering or intercept every server-side redirect. It also does not defeat CAPTCHA, authentication, license checks, paid access, or server-side verification. Use a dedicated Firefox content blocker for network-level ad blocking.

## Resolver development

Add each host-specific resolver as an isolated module with a safe test URL and expected destination. Prefer transparent URL extraction and user confirmation. Do not auto-click hidden controls, skip human verification, or trust arbitrary page scripts.
