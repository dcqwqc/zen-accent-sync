# QWQC Zen Accent Sync

A Sine mod for Zen Browser that exposes `zen.theme.accent-color`, protects it from silent Zen resets, and follows Caelestia's **effective** primary colour live.

## Caelestia mode

The bridge reads `~/.local/state/caelestia/scheme.json → colours.primary`. This is the Material/colour-scheme primary Caelestia actually renders. `color_overrides.json → primary` is only a seed and is used only as a last-resort fallback.

The local deploy installs a persistent user service:

- starts automatically with the user session;
- syncs immediately and then checks once per second;
- only rewrites the bridge file when the effective colour changes;
- `Restart=always` with a one-second restart delay;
- the browser-side Sine mod polls the tiny bridge JSON and updates Zen live;
- Zen's accent reset attempts are automatically corrected when protection is enabled.

Open **Zen Settings → Zen Mods → QWQC Zen Accent Sync** to choose **Caelestia primary color** or a **Custom Zen color**.
