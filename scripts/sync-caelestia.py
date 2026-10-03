#!/usr/bin/env python3
import configparser
import json
import os
import re
import time
from pathlib import Path

HOME = Path.home()
PROFILE_ROOT = HOME / ".var/app/app.zen_browser.zen/.zen"
OVERRIDES = HOME / ".config/caelestia/color_overrides.json"
SCHEME = HOME / ".local/state/caelestia/scheme.json"


def active_profile() -> Path:
    cfg = configparser.ConfigParser()
    cfg.read(PROFILE_ROOT / "profiles.ini")
    for section in cfg.sections():
        if section.startswith("Install") and cfg.has_option(section, "Default"):
            return PROFILE_ROOT / cfg.get(section, "Default")
    for section in cfg.sections():
        if section.startswith("Profile") and cfg.get(section, "Default", fallback="0") == "1":
            return PROFILE_ROOT / cfg.get(section, "Path")
    raise RuntimeError("No active Zen profile found")


def clean_hex(value):
    if not isinstance(value, str):
        return None
    value = value.strip().lstrip("#")
    return f"#{value.lower()}" if re.fullmatch(r"[0-9a-fA-F]{6}", value) else None


def caelestia_accent():
    if OVERRIDES.exists():
        try:
            color = clean_hex(json.loads(OVERRIDES.read_text()).get("primary"))
            if color:
                return color, "color_overrides.primary"
        except Exception:
            pass
    if SCHEME.exists():
        data = json.loads(SCHEME.read_text())
        colors = data.get("colours") or data.get("colors") or {}
        color = clean_hex(colors.get("primary"))
        if color:
            return color, "scheme.colours.primary"
    raise RuntimeError("Could not resolve a Caelestia primary color")


def main():
    profile = active_profile()
    chrome = profile / "chrome"
    chrome.mkdir(parents=True, exist_ok=True)
    target = chrome / "qwqc-caelestia-accent.json"
    accent, source = caelestia_accent()
    payload = {"accent": accent, "source": source, "updatedAt": int(time.time() * 1000)}
    tmp = target.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, indent=2) + "\n")
    os.replace(tmp, target)
    print(f"Zen accent bridge: {accent} ({source})")


if __name__ == "__main__":
    main()
