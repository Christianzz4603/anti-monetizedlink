# Anti Monetized Link

A lightweight, single-file Tampermonkey userscript for Firefox and compatible userscript managers. It recognizes known monetized shortlink hosts and surfaces destination candidates for manual review.

## v0.4.0

- Adds bounded generic extraction for meta-refresh redirects, named URL data attributes, URL-like hidden fields, encoded path segments, and URL literals in inline scripts.
- Ranks candidates by confidence (high, medium, low) and displays the strongest matches first.
- Uses strict candidate, DOM-node, script-count, and per-script text limits to keep scans predictable on lower-memory phones.
- Keeps extraction read-only: it does not execute page scripts, auto-click offers, silently navigate, or make third-party bypass requests.
- Retains the bundled Work.ink visible-destination resolver and existing host-specific URL formats.
- Keeps the installable userscript self-contained with no `@require` dependencies.

## Install

Import this raw userscript URL in Tampermonkey:

`https://raw.githubusercontent.com/Christianzz4603/anti-monetizedlink/main/src/no-adlink.user.js`

The domain registry and Work.ink resolver are bundled into that one file.

## Extraction behavior

The extractor checks explicit redirect parameters first, then known wrapper formats, meta refresh, URL-like data attributes and named hidden fields, visible outbound links, plausible Base64 path segments, and a bounded sample of inline-script URL literals. It deduplicates destinations and shows at most 12 candidates. High confidence means the destination was explicitly declared by a URL parameter or redirect field; medium means it was found in page data; low means it was inferred from a visible link or inline script. Confidence is a heuristic, not a safety guarantee. Check the destination hostname before opening it.

## Important limits

A recognized domain does not guarantee a resolver exists. Generic extraction cannot reliably handle every service, server-side redirect, CAPTCHA, login, payment, license check, or server-side verification. It does not bypass those controls. A userscript also cannot provide browser-level network filtering; use a reputable content blocker for that.

## Resolver development

Add host-specific resolvers as isolated, read-only modules during development, then bundle them into the single installable userscript. Do not auto-click hidden controls or treat arbitrary page scripts as trusted instructions.
