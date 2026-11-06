// ==UserScript==
// @name         No Adlink
// @namespace    https://github.com/Christianzz4603/no-adlink-userscript
// @version      0.2.0
// @description  Lightweight page-level ad cleanup, popup guard, and safe shortlink destination preview.
// @author       Christianzz4603
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.2.0';
  const KEY = 'no-adlink-settings-v2';
  const DEFAULTS = {
    cosmetic: true,
    popups: true,
    destinationPreview: true,
    debug: false
  };
  const settings = loadSettings();

  function loadSettings() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveSettings() {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
  }

  function log(...args) {
    if (settings.debug) console.info('[No Adlink]', ...args);
  }

  // Page-level cosmetic cleanup. This does not block network requests.
  const AD_SELECTORS = [
    'ins.adsbygoogle',
    '.adsbygoogle',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="googleadservices.com"]',
    'iframe[src*="adnxs.com"]',
    'iframe[src*="popads.net"]',
    '[id^="google_ads"]',
    '[id^="div-gpt-ad"]',
    '[class^="adsbygoogle"]',
    '[class*=" ad-banner"]',
    '[class^="ad-banner"]',
    '[class*="advertisement"]',
    '[class^="advertisement"]',
    '[data-ad-client]'
  ];

  let styleNode;
  function installCosmeticRules() {
    if (!settings.cosmetic || styleNode) return;
    const css = AD_SELECTORS.join(',') + '{display:none!important;visibility:hidden!important;}' +
      'html,body{overscroll-behavior:auto;}';
    styleNode = document.createElement('style');
    styleNode.id = 'no-adlink-cosmetic';
    styleNode.textContent = css;
    (document.documentElement || document).appendChild(styleNode);
    removeKnownAdNodes(document);
    observeAdNodes();
  }

  function removeKnownAdNodes(root) {
    if (!settings.cosmetic || !root.querySelectorAll) return;
    try {
      root.querySelectorAll(AD_SELECTORS.join(',')).forEach(node => node.remove());
    } catch (error) {
      log('Cosmetic selector error', error);
    }
  }

  let adObserver;
  function observeAdNodes() {
    if (adObserver || !document.documentElement) return;
    adObserver = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.(AD_SELECTORS.join(','))) node.remove();
          else removeKnownAdNodes(node);
        }
      }
    });
    adObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function removeCosmeticRules() {
    styleNode?.remove();
    styleNode = null;
    adObserver?.disconnect();
    adObserver = null;
  }

  // Block unsolicited script-created windows. Windows opened during a real
  // user gesture are left alone so normal links and OAuth flows can work.
  function installPopupGuard() {
    if (!settings.popups || window.__noAdlinkPopupGuard) return;
    const originalOpen = window.open;
    const guardedOpen = function(url, target, features) {
      const userInitiated = navigator.userActivation?.isActive === true;
      if (!userInitiated) {
        log('Blocked unsolicited popup:', String(url || ''));
        return null;
      }
      return originalOpen.call(window, url, target, features);
    };
    try {
      Object.defineProperty(window, 'open', {
        configurable: true,
        writable: true,
        value: guardedOpen
      });
      window.__noAdlinkPopupGuard = { originalOpen };
    } catch (error) {
      log('Popup guard could not be installed', error);
    }
  }

  function removePopupGuard() {
    const state = window.__noAdlinkPopupGuard;
    if (!state) return;
    try { window.open = state.originalOpen; } catch {}
    try { delete window.__noAdlinkPopupGuard; } catch {}
  }

  // Resolve only transparent URL wrappers. Never runs page code or contacts
  // third-party "bypass" APIs. The user sees and approves the destination.
  const DESTINATION_KEYS = [
    'url', 'u', 'target', 'destination', 'dest', 'redirect',
    'redirect_url', 'redirect_uri', 'to', 'link', 'out'
  ];

  function decodeCandidate(raw) {
    if (!raw) return null;
    let value = String(raw).trim();

    for (let i = 0; i < 2; i++) {
      try {
        const decoded = decodeURIComponent(value.replace(/\+/g, '%20'));
        if (decoded === value) break;
        value = decoded;
      } catch { break; }
    }

    // A few shorteners put a base64-encoded URL in the "r" parameter.
    if (!/^https?:\/\//i.test(value)) {
      try {
        const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
        const decoded = atob(padded);
        if (/^https?:\/\//i.test(decoded)) value = decoded;
      } catch {}
    }

    try {
      const parsed = new URL(value, location.href);
      if (!['http:', 'https:'].includes(parsed.protocol)) return null;
      if (parsed.href === location.href) return null;
      if (parsed.hostname === location.hostname) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function findDestination() {
    const current = new URL(location.href);
    const keys = [...DESTINATION_KEYS, 'r'];
    for (const key of keys) {
      const candidate = decodeCandidate(current.searchParams.get(key));
      if (candidate) return candidate;
    }
    return null;
  }

  function showDestination(candidate) {
    if (!settings.destinationPreview || document.getElementById('no-adlink-destination')) return;

    const card = document.createElement('section');
    card.id = 'no-adlink-destination';
    card.style.cssText = [
      'position:fixed', 'z-index:2147483647', 'left:12px', 'right:12px',
      'bottom:12px', 'padding:14px', 'border:1px solid #454b5b',
      'border-radius:14px', 'background:#171923', 'color:#f5f6fa',
      'font:14px/1.45 system-ui,sans-serif', 'box-shadow:0 8px 32px #0009'
    ].join(';');

    const heading = document.createElement('strong');
    heading.textContent = 'No Adlink: possible destination found';

    const url = document.createElement('div');
    url.textContent = candidate.href;
    url.style.cssText = 'overflow-wrap:anywhere;margin:8px 0;color:#b9c7ff';

    const open = document.createElement('button');
    open.textContent = 'Open destination';
    open.type = 'button';
    open.addEventListener('click', () => location.assign(candidate.href));

    const close = document.createElement('button');
    close.textContent = 'Dismiss';
    close.type = 'button';
    close.style.marginLeft = '8px';
    close.addEventListener('click', () => card.remove());

    for (const button of [open, close]) {
      button.style.cssText += ';padding:8px 12px;border:0;border-radius:8px;cursor:pointer';
    }

    card.append(heading, url, open, close);
    (document.body || document.documentElement).appendChild(card);
  }

  // Small control panel, avoiding dependency on manager-specific GM APIs.
  function addControlPanel() {
    if (document.getElementById('no-adlink-toggle')) return;

    const button = document.createElement('button');
    button.id = 'no-adlink-toggle';
    button.type = 'button';
    button.textContent = 'NL';
    button.title = 'No Adlink settings';
    button.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483646;width:42px;height:42px;border:1px solid #626b80;border-radius:50%;background:#171923;color:#fff;font:bold 13px system-ui;box-shadow:0 3px 14px #0007;cursor:pointer';

    const panel = document.createElement('div');
    panel.id = 'no-adlink-panel';
    panel.style.cssText = 'display:none;position:fixed;right:12px;bottom:62px;z-index:2147483646;width:min(280px,calc(100vw - 24px));padding:14px;border:1px solid #454b5b;border-radius:12px;background:#171923;color:#fff;font:14px/1.5 system-ui;box-shadow:0 8px 30px #0008';

    const title = document.createElement('strong');
    title.textContent = 'No Adlink ' + VERSION;
    panel.appendChild(title);

    const controls = [
      ['cosmetic', 'Hide common ad elements'],
      ['popups', 'Block unsolicited popups'],
      ['destinationPreview', 'Show shortlink destinations'],
      ['debug', 'Debug logging']
    ];

    for (const [key, label] of controls) {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:9px;margin-top:10px';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!settings[key];
      input.addEventListener('change', () => {
        settings[key] = input.checked;
        saveSettings();
        applySettings();
      });
      const text = document.createElement('span');
      text.textContent = label;
      row.append(input, text);
      panel.appendChild(row);
    }

    const note = document.createElement('p');
    note.textContent = 'Page-level filtering only. Use a dedicated content blocker for network-level ad blocking.';
    note.style.cssText = 'margin:12px 0 0;color:#b8bdca;font-size:12px';
    panel.appendChild(note);

    button.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    document.documentElement.append(button, panel);
  }

  function applySettings() {
    settings.cosmetic ? installCosmeticRules() : removeCosmeticRules();
    settings.popups ? installPopupGuard() : removePopupGuard();
    if (!settings.destinationPreview) {
      document.getElementById('no-adlink-destination')?.remove();
    } else {
      const candidate = findDestination();
      if (candidate) showDestination(candidate);
    }
  }

  function start() {
    applySettings();
    addControlPanel();
    log('Loaded on', location.hostname);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
    // Install popup guard as early as this userscript context permits.
    installPopupGuard();
  } else {
    start();
  }
})();
