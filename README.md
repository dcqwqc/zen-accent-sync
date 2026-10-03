# QWQC Zen Accent Sync

A Sine mod for Zen Browser that exposes `zen.theme.accent-color`, keeps Zen from silently replacing it, and can follow Caelestia's primary color.

Open **Zen Settings → Zen Mods → QWQC Zen Accent Sync** to choose **Caelestia primary color** or a **Custom Zen color**.

The local deploy also installs a tiny user path watcher. When Caelestia's color override or generated scheme changes, it writes the new primary color into the active Zen profile. The browser-side mod sees that bridge update and applies it live.
