#!/bin/bash
# macOS launcher used by "Start Studio.command" and "Start Demo (Replay).command".
# Finds Node even when the shell does not load nvm, installs packages on first use, then starts Studio.
cd "$(dirname "$0")/.." || exit 1
if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  for d in /opt/homebrew/bin /usr/local/bin; do [ -x "$d/node" ] && PATH="$d:$PATH"; done
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is not installed. Get it from https://nodejs.org, then double-click this file again."
  read -r -p "Press Enter to close." _
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "First run: installing packages (no install scripts run)…"
  npm ci --ignore-scripts || { read -r -p "Install failed. Press Enter to close." _; exit 1; }
fi
node app/server.mjs "$@"
echo
echo "Studio stopped. If you saw an error above, run: npm run doctor"
read -r -p "Press Enter to close." _
