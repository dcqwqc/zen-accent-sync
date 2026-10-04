from pathlib import Path
import json

script = Path('scripts/sync-caelestia.py').read_text()
service = Path('systemd/qwqc-zen-accent-sync.service').read_text()
deploy = Path('scripts/deploy-local.sh').read_text()
theme = json.loads(Path('theme.json').read_text())
js = Path('zen-accent-sync.uc.js').read_text()

assert theme['version'] == '0.2.0'
assert 'scheme.colours.primary' in script
assert script.index('if SCHEME.exists()') < script.index('if OVERRIDES.exists()')
assert 'get_scheme' in script
assert '--watch' in script and '--interval' in script
assert 'Restart=always' in service
assert 'RestartSec=1' in service
assert 'WantedBy=default.target' in service
assert 'enable --now qwqc-zen-accent-sync.service' in deploy
assert 'disable --now qwqc-zen-accent-sync.path' in deploy
assert 'runtime.version", "0.2.0"' in js
print('zen accent sync 0.2.0 invariants: ok')
