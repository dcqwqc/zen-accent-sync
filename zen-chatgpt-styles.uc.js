// ==UserScript==
// @name QWQC ChatGPT Caelestia Colors
// @description Use Zen's effective accent in ChatGPT, scoped to ChatGPT domains.
// ==/UserScript==
(() => {
  'use strict';
  const KEY = '__qwqcChatGPTStyle';
  const PREF = 'mod.qwqc.zen_accent.chatgpt_theme';
  const ACCENT = 'zen.theme.accent-color';
  const STYLE_SERVICE = '@mozilla.org/content/style-sheet-service;1';
  let timer = null;
  let registeredURI = null;
  let last = '';
  let sheetService = null;
  function normalized(value) {
    const match = String(value || '').match(/^#([0-9a-fA-F]{6})$/);
    return match ? '#' + match[1].toLowerCase() : null;
  }
  function css(accent) {
    return '@-moz-document domain("chatgpt.com"), domain("chat.openai.com") {' +
      ':root {' +
      '--chatgpt-system-accent:' + accent + ' !important;' +
      '--theme-primary-color:' + accent + ' !important;' +
      '--tw-prose-links:' + accent + ' !important;' +
      'accent-color:' + accent + ' !important;' +
      '}' +
      'a[href]:not([class*="button"]):hover { text-decoration-color:' + accent + ' !important; }' +
      '.prose a { text-decoration-color:' + accent + ' !important; }' +
      'html.dark { --chatgpt-system-accent: color-mix(in srgb, ' + accent + ' 55%, white) !important; }' +
      '}';
  }
  function update() {
    let enabled = true;
    try { enabled = Services.prefs.getBoolPref(PREF, true); } catch (_) {}
    const color = normalized(Services.prefs.getStringPref(ACCENT, ''));
    const next = enabled && color ? color : '';
    if (next === last) return;
    if (registeredURI && sheetService) {
      try { sheetService.unregisterSheet(registeredURI, sheetService.USER_SHEET); } catch (_) {}
      registeredURI = null;
    }
    last = next;
    if (!next || !sheetService) return;
    try {
      const uri = Services.io.newURI('data:text/css;charset=utf-8,' + encodeURIComponent(css(next)));
      sheetService.loadAndRegisterSheet(uri, sheetService.USER_SHEET);
      registeredURI = uri;
      Services.prefs.setStringPref('qwqc.zen_accent.runtime.chatgpt', next);
    } catch (error) { console.error('[QWQC ChatGPT Colors]', error); }
  }
  function destroy() {
    if (timer) window.clearInterval(timer);
    if (registeredURI && sheetService) {
      try { sheetService.unregisterSheet(registeredURI, sheetService.USER_SHEET); } catch (_) {}
    }
    registeredURI = null;
    if (window[KEY]?.destroy === destroy) delete window[KEY];
  }
  function start() {
    window[KEY]?.destroy?.();
    sheetService = Cc[STYLE_SERVICE].getService(Ci.nsIStyleSheetService);
    update();
    timer = window.setInterval(update, 1000);
    window[KEY] = { destroy, update };
    if (typeof window.addUnloadListener === 'function') window.addUnloadListener(destroy);
  }
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
})();
