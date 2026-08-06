#!/usr/bin/env bash
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WEB_BUILD="$REPOSITORY_ROOT/apps/web/dist"
WEB_RESOURCES="$REPOSITORY_ROOT/apps/macos/Sources/SpeccyMac/Resources/Web"
APP_ROOT="$REPOSITORY_ROOT/apps/macos/Speccy.app"

cd "$REPOSITORY_ROOT"
npm run build -w @speccy/renderer
npm run build -w @speccy/web

find "$WEB_RESOURCES" -mindepth 1 ! -name .gitkeep -delete
cp -R "$WEB_BUILD"/. "$WEB_RESOURCES"/

cd "$REPOSITORY_ROOT/apps/macos"
swift test
swift build -c release

rm -rf "$APP_ROOT"
mkdir -p "$APP_ROOT/Contents/MacOS" "$APP_ROOT/Contents/Resources"
cp ".build/release/Speccy" "$APP_ROOT/Contents/MacOS/Speccy"
cp "Info.plist" "$APP_ROOT/Contents/Info.plist"

echo "Built $APP_ROOT"

