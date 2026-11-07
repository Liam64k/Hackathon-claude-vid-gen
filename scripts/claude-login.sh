#!/bin/bash
# Opened by Studio's "Connect Claude" in a Terminal window: runs Claude Code's own sign-in, so the code
# Anthropic shows after you approve is pasted straight into Claude Code. Studio never sees it.
#   scripts/claude-login.sh <path to claude>
# API-key variables are removed so the subscription login is what gets used (same rule as Studio's runs).
unset ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN CLAUDE_CODE_OAUTH_TOKEN
echo
echo "  Studio: signing in to Claude Code"
echo "  1. Your browser opens Anthropic's sign-in page. Approve it there."
echo "  2. If the page shows a code, paste it here and press Enter."
echo
"$1" auth login
echo
if "$1" auth status 2>/dev/null | grep -q '"loggedIn": true'; then
  echo "  Signed in. Studio turns green by itself; you can close this window."
else
  echo "  Not signed in yet. Press Connect Claude in Studio to try again."
fi
read -r -p "  Press Enter to close." _
