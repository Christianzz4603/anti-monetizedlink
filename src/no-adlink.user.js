// ==UserScript==
// @name         No Adlink
// @namespace    https://github.com/Christianzz4603/no-adlink-userscript
// @version      0.1.0
// @description  Safely unwraps transparent URL-parameter redirects on supported pages.
// @author       Christianzz4603
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
  'use strict';

  const CONFIG = Object.freeze({
    maxDepth: 6,
    showNotice: true,
    // Add exact hostnames only after testing their redirect format.
    enabledHosts: [],
    parameterNames: [
      'url', 'u', 'target', 'destination', 'dest', 'redirect',
      'redirect_url', 'redirect_uri', 'to', 'link', 'r', 'out'
    ]
  });

  const STORAGE_KEY = 'no-adlink-enabled-hosts';
  const log = (...args) => console.info('[No Adlink]', ...args);

  function safeHttpUrl(value, base) {
    if (typeof value !== 'string' || !value.trim()) return null;
    let candidate = value.trim();

    try {
      // Decode common URL-encoding layers without evaluating page scripts.
      for (let i = 0; i < 2; i++) {
        const decoded = decodeURIComponent(candidate.replace(/\+/g, '%20'));
        if (decoded === candidate) break;
        candidate = decoded;
      }
      const parsed = new URL(candidate, base);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed : null;
    } catch {
      return null;
    }
  }

  function extractCandidate(pageUrl) {
    const current = new URL(pageUrl);
    const params = current.searchParams;

    for (const name of CONFIG.parameterNames) {
      const value = params.get(name);
      const candidate = safeHttpUrl(value, current.href);
      if (!candidate) continue;
      if (candidate.href === current.href) continue;
      if (candidate.hostname === current.hostname) continue;
      return candidate;
    }

    return null;
  }

  function getEnabledHosts() {
    try {
      const stored = GM_getValue(STORAGE_KEY, CONFIG.enabledHosts);
      return Array.isArray(stored) ? stored : CONFIG.enabledHosts;
    } catch {
      return CONFIG.enabledHosts;
    }
  }

  function isEnabledHost(hostname) {
    return getEnabledHosts().includes(hostname.toLowerCase());
  }

  function showCandidate(candidate) {
    if (!CONFIG.showNotice || document.getElementById('no-adlink-notice')) return;

    const box = document.createElement('aside');
    box.id = 'no-adlink-notice';
    box.style.cssText = [
      'position:fixed', 'z-index:2147483647', 'left:12px', 'right:12px',
      'bottom:12px', 'padding:14px', 'border-radius:12px',
      'background:#171923', 'color:#f7f7fb', 'font:14px/1.45 system-ui,sans-serif',
      'box-shadow:0 8px 30px #0008'
    ].join(';');

    const title = document.createElement('strong');
    title.textContent = 'No Adlink found a possible destination';

    const destination = document.createElement('div');
    destination.textContent = candidate.href;
    destination.style.cssText = 'overflow-wrap:anywhere;margin:8px 0;color:#b9c4ff';

    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Open destination';
    open.style.cssText = 'padding:8px 12px;border:0;border-radius:8px;margin-right:8px';
    open.addEventListener('click', () => {
      // User-initiated navigation only; never execute destination-page code here.
      location.assign(candidate.href);
    });

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = 'Dismiss';
    dismiss.style.cssText = 'padding:8px 12px;border:1px solid #777;border-radius:8px;background:transparent;color:inherit';
    dismiss.addEventListener('click', () => box.remove());

    box.append(title, destination, open, dismiss);
    (document.body || document.documentElement).appendChild(box);
  }

  function main() {
    if (!isEnabledHost(location.hostname)) return;

    const candidate = extractCandidate(location.href);
    if (!candidate) return;

    log('Possible destination:', candidate.href);
    showCandidate(candidate);
  }

  function configureHosts() {
    const current = getEnabledHosts();
    const host = prompt(
      'Enter an exact hostname to enable (example: short.example).\n' +
      'Current enabled hosts: ' + (current.join(', ') || '(none)')
    );
    if (!host) return;

    const normalized = host.trim().toLowerCase();
    if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(normalized)) {
      alert('Please enter a valid hostname, without a path or protocol.');
      return;
    }

    const updated = [...new Set([...current, normalized])];
    GM_setValue(STORAGE_KEY, updated);
    alert('Enabled ' + normalized + '. Reload that page to test it.');
  }

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Add current site to enabled hosts', () => {
      const current = getEnabledHosts();
      const updated = [...new Set([...current, location.hostname.toLowerCase()])];
      GM_setValue(STORAGE_KEY, updated);
      alert('Enabled ' + location.hostname + '. Reload to test.');
    });
    GM_registerMenuCommand('Configure enabled hosts', configureHosts);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main, { once: true });
  } else {
    main();
  }
})();
