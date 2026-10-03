// ==UserScript==
// @name QWQC Zen Accent Sync
// @description Persistent Zen accent color with optional Caelestia sync.
// @author qwqc
// ==/UserScript==

(() => {
  "use strict";

  const INSTANCE_KEY = "__qwqcZenAccentSync";
  const TARGET_PREF = "zen.theme.accent-color";
  const PREF_BRANCH = "mod.qwqc.zen_accent.";
  const PREFS = {
    source: `${PREF_BRANCH}source`,
    customColor: `${PREF_BRANCH}custom_color`,
    protect: `${PREF_BRANCH}protect`,
    debug: `${PREF_BRANCH}debug`
  };
  const DEFAULTS = {
    source: "caelestia",
    customColor: "#000000",
    protect: true,
    debug: false
  };

  function getPref(name, fallback) {
    try {
      const type = Services.prefs.getPrefType(name);
      if (type === Services.prefs.PREF_BOOL) return Services.prefs.getBoolPref(name);
      if (type === Services.prefs.PREF_INT) return Services.prefs.getIntPref(name);
      if (type === Services.prefs.PREF_STRING) return Services.prefs.getStringPref(name);
    } catch (_) {}
    return fallback;
  }

  function normalizeHex(value) {
    const raw = String(value ?? "").trim();
    const short = raw.match(/^#?([0-9a-fA-F]{3})$/);
    if (short) {
      const [r, g, b] = short[1].split("");
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    const full = raw.match(/^#?([0-9a-fA-F]{6})$/);
    return full ? `#${full[1].toLowerCase()}` : null;
  }

  async function createController() {
    const bridgePath = PathUtils.join(PathUtils.profileDir, "chrome", "qwqc-caelestia-accent.json");
    const config = { ...DEFAULTS };
    let bridgeColor = null;
    let timer = 0;
    let prefObserver = null;
    let targetObserver = null;
    let applying = false;
    let destroyed = false;

    const log = (...args) => {
      if (config.debug) console.debug("[QWQC Zen Accent]", ...args);
    };

    function readConfig() {
      config.source = String(getPref(PREFS.source, DEFAULTS.source));
      config.customColor = String(getPref(PREFS.customColor, DEFAULTS.customColor));
      config.protect = Boolean(getPref(PREFS.protect, DEFAULTS.protect));
      config.debug = Boolean(getPref(PREFS.debug, DEFAULTS.debug));
    }

    function effectiveColor() {
      if (config.source === "caelestia" && bridgeColor) return bridgeColor;
      return normalizeHex(config.customColor);
    }

    function applyAccent(reason = "apply") {
      if (destroyed) return;
      const next = effectiveColor();
      if (!next) {
        Services.prefs.setStringPref("qwqc.zen_accent.runtime.error", "Invalid accent color");
        return;
      }

      const current = normalizeHex(Services.prefs.getStringPref(TARGET_PREF, ""));
      if (current === next) {
        Services.prefs.setStringPref("qwqc.zen_accent.runtime.effective", next);
        return;
      }

      applying = true;
      try {
        Services.prefs.setStringPref(TARGET_PREF, next);
        Services.prefs.setStringPref("qwqc.zen_accent.runtime.effective", next);
        Services.prefs.setStringPref("qwqc.zen_accent.runtime.last_reason", reason);
        try { Services.prefs.clearUserPref("qwqc.zen_accent.runtime.error"); } catch (_) {}
        log(reason, current, "->", next);
      } finally {
        applying = false;
      }
    }

    async function refreshBridge() {
      if (destroyed || config.source !== "caelestia") return;
      try {
        if (!(await IOUtils.exists(bridgePath))) return;
        const data = await IOUtils.readJSON(bridgePath);
        const next = normalizeHex(data?.accent);
        if (!next) return;
        if (bridgeColor !== next) {
          bridgeColor = next;
          Services.prefs.setStringPref("qwqc.zen_accent.runtime.caelestia", next);
          applyAccent("caelestia-sync");
        }
      } catch (error) {
        Services.prefs.setStringPref("qwqc.zen_accent.runtime.error", String(error));
        log("bridge read failed", error);
      }
    }

    readConfig();
    await refreshBridge();
    applyAccent("startup");

    prefObserver = {
      observe() {
        readConfig();
        if (config.source === "caelestia") refreshBridge();
        else applyAccent("settings-change");
      }
    };
    Services.prefs.addObserver(PREF_BRANCH, prefObserver);

    targetObserver = {
      observe() {
        if (!applying && config.protect) window.setTimeout(() => applyAccent("zen-reset-guard"), 0);
      }
    };
    Services.prefs.addObserver(TARGET_PREF, targetObserver);

    timer = window.setInterval(refreshBridge, 1000);
    Services.prefs.setBoolPref("qwqc.zen_accent.runtime.loaded", true);
    Services.prefs.setStringPref("qwqc.zen_accent.runtime.version", "0.1.0");

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (timer) window.clearInterval(timer);
      try { Services.prefs.removeObserver(PREF_BRANCH, prefObserver); } catch (_) {}
      try { Services.prefs.removeObserver(TARGET_PREF, targetObserver); } catch (_) {}
      Services.prefs.setBoolPref("qwqc.zen_accent.runtime.loaded", false);
      if (window[INSTANCE_KEY]?.destroy === destroy) delete window[INSTANCE_KEY];
    }

    return { destroy, refreshBridge, applyAccent };
  }

  const start = async () => {
    try {
      window[INSTANCE_KEY]?.destroy?.();
      const controller = await createController();
      window[INSTANCE_KEY] = controller;
      if (typeof window.addUnloadListener === "function") window.addUnloadListener(() => controller.destroy());
    } catch (error) {
      console.error("[QWQC Zen Accent] failed to initialize", error);
    }
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
