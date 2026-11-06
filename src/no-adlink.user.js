// ==UserScript==
// @name         Anti Monetized Link
// @namespace    https://github.com/Christianzz4603/anti-monetizedlink
// @version      0.4.1
// @description  Detect monetized shortlinks and show possible destination URLs for manual review.
// @author       Christianzz4603
// @license      MIT
// @homepageURL  https://github.com/Christianzz4603/anti-monetizedlink
// @supportURL   https://github.com/Christianzz4603/anti-monetizedlink/issues
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @noframes
// @updateURL    https://raw.githubusercontent.com/Christianzz4603/anti-monetizedlink/main/src/no-adlink.user.js
// @downloadURL  https://raw.githubusercontent.com/Christianzz4603/anti-monetizedlink/main/src/no-adlink.user.js
// ==/UserScript==

/* Bundled domain registry */
// ==No Adlink domain registry==
// Classification only. A match does not guarantee a resolver exists.
(function (root) {
  'use strict';
  root.NoAdlinkDomains = Object.freeze({
    version: '0.4.0',
    monetized: Object.freeze([
      'linkvertise.com','link-to.net','link-hub.net','link-target.net','link-target.org','linkvertise.net',
      'file-link.net','direct-link.net','up-to-down.net','link-center.net','shrtfly.com','stfly.vip',
      'shrtslug.biz','shrinkme.io','shrinkme.com','shrinkearn.com','clk.sh','cuty.io','cety.io',
      'ouo.io','ouo.press','work.ink','workink.net','lootlabs.gg','loot-link.com','links.lootlabs.gg',
      'lootdest.org','free-content.pro','lootdest.com','lootlinks.com','lootlinks.co','exe.io','boost.ink',
      'adfoc.us','shorte.st','bc.vc','binbucks.com','xut.io','adshrink.it','gplinks.in','shrink.pe',
      'paster.so','paster.gg','boostylink.com','lockr.so','lockr.net','lockr.to','rinku.pro','7mb.io',
      'rinku.me','fly.inc','adf.ly','adfly.com','adfly.me'
    ]),
    resolverHosts: Object.freeze(['linkvip.io','blitly.io','l4s.cc','pastebin.com'])
  });
})(globalThis);

/* Bundled Work.ink resolver */
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


(() => {
  'use strict';
  const VERSION = '0.4.1';
  const STORE = 'no-adlink-settings-v3';
  const DEFAULTS = { cosmetic: true, popups: true, preview: true, debug: false };
  let settings = { ...DEFAULTS };
  try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch {}
  const log = (...args) => settings.debug && console.info('[No Adlink]', ...args);
  const registry = globalThis.NoAdlinkDomains || { monetized: [], resolverHosts: [] };
  const matchesDomain = list => list.some(d => location.hostname === d || location.hostname.endsWith('.' + d));
  const isMonetizedHost = host => registry.monetized.some(d => host === d || host.endsWith('.' + d));
  const isKnownAdlink = matchesDomain(registry.monetized);

  const AD_SELECTORS = [
    'ins.adsbygoogle','.adsbygoogle','[data-ad-client]','[id^="google_ads"]',
    '[id^="div-gpt-ad"]','iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]','iframe[src*="googleadservices.com"]',
    'iframe[src*="adnxs.com"]','iframe[src*="popads.net"]',
    '[class*="advertisement"]','[class*="ad-banner"]'
  ];
  let styleNode = null, observer = null;
  function cleanAds(root = document) {
    if (!settings.cosmetic || !root.querySelectorAll) return;
    try { root.querySelectorAll(AD_SELECTORS.join(',')).forEach(n => n.remove()); } catch (e) { log(e); }
  }
  function installCosmetic() {
    if (!settings.cosmetic || styleNode || !document.documentElement) return;
    styleNode = document.createElement('style');
    styleNode.textContent = AD_SELECTORS.join(',') + '{display:none!important;visibility:hidden!important}';
    document.documentElement.appendChild(styleNode);
    cleanAds();
    observer = new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => {
      if (n.nodeType === 1) {
        try { if (n.matches(AD_SELECTORS.join(','))) n.remove(); else cleanAds(n); } catch {}
      }
    })));
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  function removeCosmetic() { styleNode?.remove(); styleNode = null; observer?.disconnect(); observer = null; }

  // Do not block legitimate popups when the browser lacks the User Activation API.
  function installPopupGuard() {
    if (!settings.popups || window.__noAdlinkPopupGuard) return;
    const original = window.open;
    const wrapped = function(url, target, features) {
      const activation = navigator.userActivation;
      if (activation && activation.isActive !== true) {
        log('Blocked unsolicited popup', String(url || ''));
        return null;
      }
      return original.call(window, url, target, features);
    };
    try {
      Object.defineProperty(window, 'open', { configurable: true, writable: true, value: wrapped });
      window.__noAdlinkPopupGuard = { original };
    } catch (e) { log('Popup guard unavailable', e); }
  }
  function removePopupGuard() {
    const state = window.__noAdlinkPopupGuard;
    if (!state) return;
    try { window.open = state.original; delete window.__noAdlinkPopupGuard; } catch {}
  }

  const PARAMS = ['url','u','target','destination','dest','redirect','redirect_url','redirect_uri','to','link','out','r','data'];
  function decodeBase64(value) {
    try {
      const s = value.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(s + '='.repeat((4 - s.length % 4) % 4));
      return decoded;
    } catch { return ''; }
  }
  function validHttp(raw) {
    try {
      const u = new URL(raw, location.href);
      return /^https?:$/.test(u.protocol) && u.hostname !== location.hostname ? u : null;
    } catch { return null; }
  }
  function unwrap(raw) {
    if (!raw) return null;
    let value = String(raw).trim();
    for (let i = 0; i < 3; i++) {
      try { const next = decodeURIComponent(value.replace(/\+/g, '%20')); if (next === value) break; value = next; } catch { break; }
    }
    let found = validHttp(value);
    if (found) return found;
    const b64 = decodeBase64(value);
    found = validHttp(b64);
    return found;
  }
  function extractCandidates() {
    const out = new Map();
    const MAX_CANDIDATES = 60;
    const MAX_SCAN_TEXT = 64000;
    const add = (value, source, confidence = 'medium') => {
      if (!value || out.size >= MAX_CANDIDATES) return;
      const u = unwrap(value);
      if (!u || isMonetizedHost(u.hostname)) return;
      const previous = out.get(u.href);
      const rank = confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1;
      const oldRank = previous ? (previous.confidence === 'high' ? 3 : previous.confidence === 'medium' ? 2 : 1) : 0;
      if (!previous || rank > oldRank) out.set(u.href, { url: u.href, source, confidence });
    };
    const current = new URL(location.href);

    // Explicit redirect parameters are the strongest and cheapest signal.
    for (const key of PARAMS) {
      const value = current.searchParams.get(key);
      if (value) add(value, 'URL parameter: ' + key, 'high');
    }

    // Known transparent URL wrappers.
    if (/^(linkvip|blitly)\.io$/.test(location.hostname)) add(current.searchParams.get('url'), 'Link wrapper parameter', 'high');
    if (location.hostname === 'l4s.cc') {
      const match = current.pathname.match(/\/(?:q\/e\/)?(?:1f|482)\/([A-Za-z0-9_=-]{8,700})/);
      if (match) {
        const decoded = decodeBase64(match[1]);
        add(decoded, 'Encoded path destination', 'high');
        try { add(new URL(decoded).searchParams.get('url'), 'Nested URL parameter', 'high'); } catch {}
      }
    }
    if (location.hostname === 'pastebin.com' && current.pathname.startsWith('/raw/')) {
      const raw = (document.body?.innerText || '').trim();
      if (/^https?:\/\/\S+$/i.test(raw)) add(raw, 'Plain-text destination', 'high');
    }

    // Meta refresh is a common, directly-declared redirect format.
    for (const meta of document.querySelectorAll('meta[http-equiv]')) {
      if ((meta.httpEquiv || '').toLowerCase() !== 'refresh') continue;
      const match = (meta.content || '').match(/(?:^|;)\s*url\s*=\s*['"]?([^'"]+)/i);
      if (match) add(match[1].trim(), 'Meta refresh destination', 'high');
    }

    // Scan a bounded set of URL-like data attributes and named hidden fields.
    const nodes = document.querySelectorAll('[data-url],[data-href],[data-destination],[data-redirect],[data-target],input[type="hidden"]');
    for (let i = 0; i < nodes.length && i < 500 && out.size < MAX_CANDIDATES; i++) {
      const node = nodes[i];
      if (node.matches('input[type="hidden"]')) {
        const name = (node.name || node.id || '').toLowerCase();
        if (!/(^|[_-])(url|link|target|dest|destination|redirect|out)([_-]|$)/.test(name)) continue;
        if (/(csrf|token|auth|session|nonce|signature|password)/i.test(name)) continue;
        add(node.value, 'Named hidden URL field: ' + name, 'medium');
        continue;
      }
      for (const attr of ['data-url', 'data-href', 'data-destination', 'data-redirect', 'data-target']) {
        const value = node.getAttribute(attr);
        if (value) add(value, 'Element ' + attr, 'medium');
      }
    }

    // Visible links are choices, not automatic redirects. On other pages only
    // scan a small subset to avoid turning ordinary pages into link catalogs.
    const anchors = document.querySelectorAll('a[href]');
    const anchorLimit = isKnownAdlink ? 250 : 80;
    for (let i = 0; i < anchors.length && i < anchorLimit && out.size < MAX_CANDIDATES; i++) {
      const anchor = anchors[i];
      if (!anchor.isConnected || !anchor.getClientRects().length) continue;
      const u = validHttp(anchor.href);
      if (u && !isMonetizedHost(u.hostname)) {
        add(u.href, 'Visible page link: ' + (anchor.textContent.trim().slice(0, 45) || 'untitled'), isKnownAdlink ? 'medium' : 'low');
      }
    }

    // Decode plausible Base64 path segments without scanning or executing scripts.
    for (const segment of current.pathname.split('/').slice(1, 8)) {
      if (segment.length < 16 || segment.length > 700 || !/^[A-Za-z0-9_-]+={0,2}$/.test(segment)) continue;
      const decoded = decodeBase64(segment);
      if (/^https?:\/\//i.test(decoded)) add(decoded, 'Decoded path segment', 'medium');
    }

    // Parse URL literals from a bounded number of inline scripts. This is a
    // read-only text scan; page code is never evaluated and no requests are made.
    const scripts = document.querySelectorAll('script:not([src])');
    for (let i = 0; i < scripts.length && i < 20 && out.size < MAX_CANDIDATES; i++) {
      const text = (scripts[i].textContent || '').slice(0, MAX_SCAN_TEXT);
      if (!text || !/(https?:|https?\\x3a|https?\\u003a)/i.test(text)) continue;
      const normalized = text.replace(/\\\//g, '/').replace(/\\u0026/gi, '&').replace(/\\u003d/gi, '=');
      const urls = normalized.match(/https?:\/\/[^\s"'<>\\`]{8,700}/gi);
      if (!urls) continue;
      for (let j = 0; j < urls.length && out.size < MAX_CANDIDATES; j++) {
        add(urls[j].replace(/[),.;\]}]+$/, ''), 'Inline script URL literal', 'low');
      }
    }

    // Run isolated, transparent host resolvers when they are loaded.
    const workInkResolver = globalThis.NoAdlinkResolvers?.workInk;
    if (typeof workInkResolver === 'function' && out.size < MAX_CANDIDATES) {
      try {
        for (const item of workInkResolver({ document, location, validHttp, isMonetizedHost })) {
          if (item?.url) add(item.url, item.source || 'Work.ink visible destination', 'medium');
        }
      } catch (e) { log('Work.ink resolver error', e); }
    }

    return [...out.values()].sort((a, b) => {
      const score = x => x.confidence === 'high' ? 3 : x.confidence === 'medium' ? 2 : 1;
      return score(b) - score(a);
    }).slice(0, 12);
  }

  function showPanel() {
    if (!document.documentElement || document.getElementById('no-adlink-root')) return;
    const root = document.createElement('div');
    root.id = 'no-adlink-root';
    root.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;font:14px system-ui;color:#f4f6ff';
    const toggle = document.createElement('button');
    toggle.textContent = 'NL';
    toggle.title = 'No Adlink settings';
    toggle.style.cssText = 'width:44px;height:44px;border-radius:50%;border:1px solid #68718a;background:#171923;color:white;font-weight:700';
    const panel = document.createElement('section');
    panel.hidden = true;
    panel.style.cssText = 'width:min(340px,calc(100vw - 36px));max-height:55vh;overflow:auto;margin-bottom:8px;padding:14px;border:1px solid #454b5b;border-radius:12px;background:#171923;box-shadow:0 8px 30px #0009';
    const heading = document.createElement('strong');
    heading.textContent = 'No Adlink ' + VERSION + (isKnownAdlink ? ' · adlink detected' : '');
    panel.appendChild(heading);
    const candidates = extractCandidates();
    if (candidates.length) {
      const label = document.createElement('p'); label.textContent = 'Possible destinations. Check the domain before opening.'; panel.appendChild(label);
      candidates.slice(0, 12).forEach(item => {
        const row = document.createElement('div'); row.style.cssText = 'margin:8px 0;padding:8px;background:#252a38;border-radius:8px;overflow-wrap:anywhere';
        const source = document.createElement('small'); source.textContent = item.source + ' · ' + item.confidence + ' confidence'; source.style.display = 'block';
        const link = document.createElement('a'); link.href = item.url; link.textContent = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.style.color = '#b9c7ff';
        row.append(source, link); panel.appendChild(row);
      });
    } else {
      const empty = document.createElement('p'); empty.textContent = 'No transparent destination found on this page.'; panel.appendChild(empty);
    }
    const note = document.createElement('small');
    note.textContent = 'Recognizing a domain is not the same as resolving it. CAPTCHA, account checks, paid access and server-side verification are not bypassed.';
    note.style.cssText = 'display:block;color:#b8bdca;margin-top:10px';
    panel.appendChild(note);
    for (const [key, label] of [['cosmetic','Hide common ad elements'],['popups','Block unsolicited popups'],['preview','Show destination panel'],['debug','Debug logging']]) {
      const row = document.createElement('label'); row.style.cssText = 'display:flex;gap:8px;margin-top:9px;align-items:center';
      const input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!settings[key];
      input.addEventListener('change', () => {
        settings[key] = input.checked;
        try { localStorage.setItem(STORE, JSON.stringify(settings)); } catch {}
        applySettings();
      });
      row.append(input, document.createTextNode(label)); panel.appendChild(row);
    }
    toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; });
    root.append(panel, toggle); document.documentElement.appendChild(root);
    if (!settings.preview) panel.hidden = true;
    else if (candidates.length || isKnownAdlink) panel.hidden = false;
  }
  function applySettings() {
    settings.cosmetic ? installCosmetic() : removeCosmetic();
    settings.popups ? installPopupGuard() : removePopupGuard();
  }
  function start() { applySettings(); showPanel(); }
  if (document.readyState === 'loading') {
    installPopupGuard();
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else start();
})();
