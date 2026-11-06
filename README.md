# Anti Monetized Link

A lightweight, standalone Tampermonkey userscript that recognizes monetized-link and shortlink hosts, inspects page data for possible destinations, and lets the user decide what to open. It is designed to keep scanning bounded on lower-memory Android devices.

## v0.5.0

- Expands the curated registry and separates monetized ad-link hosts, other redirect/wrapper hosts, and common download hosts. Download hosts remain valid destination candidates rather than being mistakenly filtered as shorteners.
- Improves URL decoding: repeated percent-encoding, Base64/Base64URL with UTF-8 decoding, JSON-wrapped destinations, escaped slashes, HTML entities, nested redirect parameters, and URL literals embedded in wrapper strings.
- Adds extraction from URL fragments, structured JSON/JSON-LD, more `data-*` attributes, hidden URL fields, meta-refresh tags, inline-script literals, and visible outbound links.
- Adds nested shortlink unwrapping when a known wrapper exposes another URL parameter.
- Rejects non-HTTP(S) schemes, credential-bearing URLs, same-page URLs, and localhost destinations.
- Uses bounded scanning: at most 80 unique candidates, 12 displayed, 700 URL-bearing DOM nodes, 300 anchors on recognized wrappers (100 elsewhere), 24 inline scripts, 12 structured JSON blocks, and capped text sizes.
- Keeps Work.ink as a dedicated read-only visible-destination resolver.
- Adds an on-demand rescan button for pages that reveal destinations after initial load.
- Does not execute page scripts, make third-party resolver requests, auto-click offers, or navigate without user action.
- Ships as one installable `.user.js` with no `@require` dependencies.

## Install

Install the raw userscript in Tampermonkey:

`https://raw.githubusercontent.com/Christianzz4603/anti-monetizedlink/main/src/no-adlink.user.js`

The domain registry and Work.ink resolver are bundled into the single distribution file.

## How detection works

The script checks explicit query and fragment parameters, known wrapper formats, nested redirect parameters, meta refresh, URL-like data attributes, named hidden fields, structured JSON, visible outbound links, plausible Base64 path segments, and a bounded sample of inline script text. Candidates are deduplicated and ranked as high, medium, or low confidence. Confidence describes how directly the page exposed a URL. It is not a malware or trust verdict. Always inspect the hostname before opening a candidate.

The registry separates `monetized` hosts from `shortlinkHosts` and `downloadHosts`. Recognition is not proof that a dedicated resolver exists. Download hosts are not treated as shortlink wrappers, so they can still appear as destinations.

## Safety and limitations

Anti Monetized Link is a destination inspector, not a verification-circumvention service. It does not bypass CAPTCHA, login, account, payment, license, social-unlock, or server-side verification. It does not fake user agents, spoof requests, or call third-party bypass APIs. A host that requires a server-side step may produce no destination candidate.

A userscript cannot reliably intercept all network redirects or provide browser-level request filtering. Use a reputable content blocker for network-level ad blocking.

## Performance and privacy

Scanning is read-only and bounded. The script does not send the current page URL to an external service. No external `@require`, `@connect`, or privileged GM grants are used. The cosmetic cleaner and popup guard are optional settings.

## Development

Host-specific resolvers should be isolated, read-only, and bundled into the single distribution file. Add a resolver only when a destination is transparently exposed in page data or visible outbound links. Do not auto-click hidden controls or treat arbitrary page scripts as trusted instructions.

## Tampermonkey metadata

- `@match *://*/*`: HTTP/HTTPS pages.
- `@run-at document-start`: early initialization; DOM scans wait for `DOMContentLoaded`.
- `@grant none`: standard browser APIs only.
- `@noframes`: top-frame only.
- `@updateURL` and `@downloadURL`: canonical raw file on `main`.
- `@license MIT`: repository license.
