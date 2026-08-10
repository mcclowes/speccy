#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WEB_BUILD="$REPOSITORY_ROOT/apps/web/dist"
WEB_RESOURCES="$REPOSITORY_ROOT/apps/macos/Sources/SpeccyMac/Resources/Web"
APP_ROOT="$REPOSITORY_ROOT/apps/macos/Speccy.app"
RESOURCE_BUNDLE="SpeccyMac_SpeccyMac.bundle"

cd "$REPOSITORY_ROOT"
npm run build -w speccy-renderer
npm run build -w @speccy/web

find "$WEB_RESOURCES" -mindepth 1 ! -name .gitkeep -delete
cp -R "$WEB_BUILD"/. "$WEB_RESOURCES"/

cd "$REPOSITORY_ROOT/apps/macos"
swift test
swift build -c release

rm -rf "$APP_ROOT"
mkdir -p "$APP_ROOT/Contents/MacOS" "$APP_ROOT/Contents/Resources"
cp ".build/release/Speccy" "$APP_ROOT/Contents/MacOS/Speccy"
cp -R ".build/release/$RESOURCE_BUNDLE" "$APP_ROOT/$RESOURCE_BUNDLE"
cp "Info.plist" "$APP_ROOT/Contents/Info.plist"

test -f "$APP_ROOT/$RESOURCE_BUNDLE/Web/index.html"

echo "Built $APP_ROOT"
open "$APP_ROOT"
