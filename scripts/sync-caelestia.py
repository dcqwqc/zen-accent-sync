#!/usr/bin/env python3
import argparse
import configparser
import json
import os
import re
import signal
import sys
import time
from pathlib import Path

HOME = Path.home()
PROFILE_ROOT = HOME / ".var/app/app.zen_browser.zen/.zen"
OVERRIDES = HOME / ".config/caelestia/color_overrides.json"
SCHEME = HOME / ".local/state/caelestia/scheme.json"
RUNNING = True


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


def effective_caelestia_accent():
    """Return the colour Caelestia is actually using, not merely its seed.

    color_overrides.primary is a Material-You seed. Caelestia regenerates the
    palette from that seed, so the effective UI primary can differ. scheme.json
    contains the generated palette used by the shell and is therefore the
    authoritative bridge source.
    """
    if SCHEME.exists():
        try:
            data = json.loads(SCHEME.read_text())
            colours = data.get("colours") or data.get("colors") or {}
            color = clean_hex(colours.get("primary"))
            if color:
                return color, "scheme.colours.primary"
        except Exception as error:
            print(f"scheme read failed: {error}", file=sys.stderr, flush=True)

    # Fallback to Caelestia's Python API if the state file is absent/broken.
    try:
        from caelestia.utils.scheme import get_scheme
        scheme = get_scheme()
        colors = getattr(scheme, "colours", {}) or {}
        color = clean_hex(colors.get("primary"))
        if color:
            return color, "caelestia.get_scheme.primary"
    except Exception as error:
        print(f"Caelestia API fallback failed: {error}", file=sys.stderr, flush=True)

    # Last-resort fallback. This is a seed, not necessarily the rendered M3
    # primary, but it is better than losing the bridge completely.
    if OVERRIDES.exists():
        try:
            color = clean_hex(json.loads(OVERRIDES.read_text()).get("primary"))
            if color:
                return color, "color_overrides.primary.fallback"
        except Exception as error:
            print(f"override fallback failed: {error}", file=sys.stderr, flush=True)

    raise RuntimeError("Could not resolve Caelestia's effective primary color")


def write_bridge(force=False):
    profile = active_profile()
    chrome = profile / "chrome"
    chrome.mkdir(parents=True, exist_ok=True)
    target = chrome / "qwqc-caelestia-accent.json"

    accent, source = effective_caelestia_accent()
    previous = None
    if target.exists():
        try:
            previous = json.loads(target.read_text())
        except Exception:
            pass

    if (
        not force
        and isinstance(previous, dict)
        and previous.get("accent") == accent
        and previous.get("source") == source
    ):
        return False, accent, source

    payload = {
        "accent": accent,
        "source": source,
        "updatedAt": int(time.time() * 1000),
    }
    tmp = target.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, indent=2) + "\n")
    os.replace(tmp, target)
    return True, accent, source


def stop(_signum, _frame):
    global RUNNING
    RUNNING = False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--watch", action="store_true", help="Keep syncing continuously")
    parser.add_argument("--interval", type=float, default=1.0)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    if not args.watch:
        changed, accent, source = write_bridge(force=args.force)
        print(f"Zen accent bridge: {accent} ({source}){' [updated]' if changed else ' [unchanged]'}")
        return

    print("QWQC Zen accent bridge watching Caelestia", flush=True)
    last_error = None
    while RUNNING:
        try:
            changed, accent, source = write_bridge(force=False)
            if changed:
                print(f"Zen accent bridge: {accent} ({source})", flush=True)
            last_error = None
        except Exception as error:
            message = str(error)
            if message != last_error:
                print(f"Zen accent bridge error: {message}", file=sys.stderr, flush=True)
                last_error = message
        time.sleep(max(0.25, args.interval))


if __name__ == "__main__":
    main()
