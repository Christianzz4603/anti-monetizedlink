// ==NoAdlink resolver: Work.ink==
// Independent, read-only destination discovery.
// This module does not click offer buttons, alter page controls, spoof ad requests,
// remove access offers, or bypass CAPTCHA/account/payment verification.
(function (root) {
  'use strict';
  root.NoAdlinkResolvers = root.NoAdlinkResolvers || {};
  root.NoAdlinkResolvers.workInk = function (context) {
    const { document, location, validHttp, isMonetizedHost } = context;
    const host = location.hostname;
    if (host !== 'work.ink' && !host.endsWith('.work.ink')) return [];

    const found = new Map();
    const elements = document.querySelectorAll('a[href], [data-url], [data-destination], [data-href]');
    elements.forEach(element => {
      if (!element.isConnected || element.hidden || element.getAttribute('aria-hidden') === 'true') return;
      if (!element.getClientRects().length) return;
      const view = document.defaultView;
      if (view) {
        const style = view.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
      }
      const raw = element.href ||
        element.getAttribute('data-url') ||
        element.getAttribute('data-destination') ||
        element.getAttribute('data-href');
      const url = validHttp(raw);
      if (!url || isMonetizedHost(url.hostname)) return;
      found.set(url.href, {
        url: url.href,
        source: 'Work.ink visible outbound destination'
      });
    });
    return [...found.values()];
  };
})(globalThis);
