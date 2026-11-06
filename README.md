# No Adlink

A lightweight Tampermonkey userscript for identifying transparent redirect URLs.

## Status

**Early development (0.1.0).** This first version is a safe foundation, not a universal shortlink bypass and does not claim support for 1,000+ domains.

## Install

1. Install Tampermonkey in a supported browser.
2. Open `src/no-adlink.user.js` on GitHub.
3. Choose **Raw** and install it through Tampermonkey.
4. On a redirect page, open the Tampermonkey menu and choose **Add current site to enabled hosts**.
5. Reload the page. If a recognized destination parameter is present, the script displays it and lets you open it manually.

## Current behavior

- Checks common destination parameter names such as `url`, `target`, `redirect`, and `destination`.
- Decodes a limited number of URL-encoding layers.
- Accepts only HTTP and HTTPS destinations.
- Requires an exact hostname to be enabled by the user.
- Shows the candidate destination before navigating.
- Does not execute page-provided JavaScript or silently navigate.
- Does not defeat CAPTCHAs, authentication, access controls, or server-side verification.

## Development

The next stage is to add independently tested, host-specific resolvers. Each resolver should document the URL format it handles and include test cases. Avoid broad wildcard rules: they can mistake ordinary query parameters for redirects.

## Security notes

Only enable hosts you trust. A redirect destination can be deceptive even when it uses HTTPS. Check the destination hostname before opening it.
