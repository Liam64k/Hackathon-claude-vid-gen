#!/bin/bash
# Double-click to start Studio in Replay mode (recorded runs, no Claude usage). Close the window to stop it.
exec "$(dirname "$0")/scripts/start-mac.sh" --replay
