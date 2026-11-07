#!/bin/bash
# Builds dist/Studio.app: a double-clickable Mac app with Studio's icon.
#   npm run app:mac        (or: bash scripts/mac-app/build-mac-app.sh)
# The app does not copy the code: it runs Studio from this project folder (Studio keeps your projects
# in episodes/ here, and the packages are several hundred MB). Double-click:
#   - Studio already running: reopens it in the browser;
#   - otherwise: a Terminal window starts it (close that window to stop Studio), and the browser opens.
# Rebuild after moving the project folder.
set -euo pipefail
cd "$(dirname "$0")/../.."
REPO="$(pwd)"
APP="$REPO/dist/Studio.app"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Building $APP"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

# icon: one 1024 px drawing, scaled to every size macOS asks for
swift scripts/mac-app/make-icon.swift "$TMP/icon.png" >/dev/null
ICONSET="$TMP/Studio.iconset"
mkdir -p "$ICONSET"
for s in 16 32 128 256 512; do
  sips -z $s $s "$TMP/icon.png" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  sips -z $((s * 2)) $((s * 2)) "$TMP/icon.png" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/Studio.icns"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Studio</string>
  <key>CFBundleDisplayName</key><string>Studio</string>
  <key>CFBundleIdentifier</key><string>local.hackathon.studio</string>
  <key>CFBundleExecutable</key><string>Studio</string>
  <key>CFBundleIconFile</key><string>Studio</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$(node -p 'require("./package.json").version')</string>
  <key>CFBundleVersion</key><string>$(git rev-parse --short HEAD 2>/dev/null || echo dev)</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
PLIST

# the launcher: reopen a running Studio, else start it in Terminal
cat > "$APP/Contents/MacOS/Studio" <<'LAUNCH'
#!/bin/bash
REPO="__REPO__"
# fall back to the folder the app sits in (dist/Studio.app inside the project)
[ -f "$REPO/app/server.mjs" ] || REPO="$(cd "$(dirname "$0")/../../../.." && pwd)"
if [ ! -f "$REPO/app/server.mjs" ]; then
  osascript -e 'display alert "Studio can'"'"'t find its project folder" message "The folder was moved or deleted. Run npm run app:mac in the project folder to rebuild Studio.app." as critical'
  exit 1
fi
# written by a running live Studio (app/server.mjs); the app can't read ~/Documents, so it's kept here
LOCK="$HOME/Library/Application Support/Studio/running-live.json"
if [ -f "$LOCK" ]; then
  PID="$(grep -o '"pid": *[0-9]*' "$LOCK" | grep -o '[0-9]*$')"
  LINK="$(grep -o '"link": *"[^"]*"' "$LOCK" | sed 's/.*"\(http[^"]*\)"/\1/')"
  if [ -n "$PID" ] && [ -n "$LINK" ] && kill -0 "$PID" 2>/dev/null; then
    open "$LINK"
    exit 0
  fi
fi
open -a Terminal "$REPO/Start Studio.command"
LAUNCH
sed -i '' "s|__REPO__|${REPO//|/\\|}|" "$APP/Contents/MacOS/Studio"
chmod +x "$APP/Contents/MacOS/Studio"

# ad-hoc signature so macOS treats the bundle as one app (it is built locally, so no quarantine)
codesign --force --sign - "$APP" >/dev/null 2>&1 || true
touch "$APP"
echo "Done: $APP"
echo "Double-click it, or drag it to the Dock or Applications."
