// ==UserScript==
// @name         Anti Monetized Link
// @namespace    https://github.com/Christianzz4603/anti-monetizedlink
// @version      0.3.2
// @description  Monetized shortlink recognition, safe destination extraction, ad cleanup and popup protection.
// @author       Christianzz4603
// @match        *://*/*
// @run-at       document-start
// @require      https://raw.githubusercontent.com/Christianzz4603/anti-monetizedlink/main/src/domain-registry.js
// @require      https://raw.githubusercontent.com/Christianzz4603/anti-monetizedlink/main/src/resolvers/work-ink.js
// @updateURL    https://raw.githubusercontent.com/Christianzz4603/anti-monetizedlink/main/src/no-adlink.user.js
// @downloadURL  https://raw.githubusercontent.com/Christianzz4603/anti-monetizedlink/main/src/no-adlink.user.js
// @grant        none
// ==/UserScript==

/* Bundled domain registry */
// ==No Adlink domain registry==
// Classification only. A match does not guarantee a resolver exists.
(function (root) {
  'use strict';
  root.NoAdlinkDomains = Object.freeze({
    version: '0.3.0',
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
  const VERSION = '0.3.2';
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
    const add = (value, source) => {
      const u = unwrap(value);
      if (u && !out.has(u.href)) out.set(u.href, source);
    };
    const current = new URL(location.href);
    for (const key of PARAMS) add(current.searchParams.get(key), 'URL parameter: ' + key);

    // Transparent host-specific URL wrappers documented by their page format.
    if (/^(linkvip|blitly)\.io$/.test(location.hostname)) add(current.searchParams.get('url'), 'Link wrapper parameter');
    if (location.hostname === 'l4s.cc') {
      const match = location.pathname.match(/\/(?:q\/e\/)?(?:1f|482)\/([A-Za-z0-9_=-]+)/);
      if (match) {
        const decoded = decodeBase64(match[1]);
        add(decoded, 'Encoded path destination');
        try { add(new URL(decoded).searchParams.get('url'), 'Nested URL parameter'); } catch {}
      }
    }
    if (location.hostname === 'pastebin.com' && location.pathname.startsWith('/raw/')) {
      const raw = (document.body?.innerText || '').trim();
      if (/^https?:\/\/\S+$/i.test(raw)) add(raw, 'Plain-text destination');
    }

    // On known adlink hosts, expose outbound page links as choices instead of
    // guessing which hidden/decoy link is the real destination.
    if (isKnownAdlink) {
      document.querySelectorAll('a[href]').forEach(a => {
        const u = validHttp(a.href);
        if (u && !isMonetizedHost(u.hostname) && a.getClientRects().length) out.set(u.href, 'Page link: ' + (a.textContent.trim().slice(0, 50) || 'untitled'));
      });
    }

    // Run isolated, transparent host resolvers when they are loaded.
    const workInkResolver = globalThis.NoAdlinkResolvers?.workInk;
    if (typeof workInkResolver === 'function') {
      try {
        for (const item of workInkResolver({ document, location, validHttp, isMonetizedHost })) {
          if (item?.url && !out.has(item.url)) out.set(item.url, item.source || 'Work.ink visible destination');
        }
      } catch (e) { log('Work.ink resolver error', e); }
    }
    return [...out.entries()].map(([url, source]) => ({ url, source }));
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
        const source = document.createElement('small'); source.textContent = item.source; source.style.display = 'block';
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
