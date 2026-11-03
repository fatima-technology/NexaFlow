#!/usr/bin/env bash
# Replace Capacitor's default launcher icon with the NexaFlow icon (run after `cap add android`).
set -e
RES=android/app/src/main/res
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  cp branding/mipmap-$d/ic_launcher.png "$RES/mipmap-$d/ic_launcher.png"
  cp branding/mipmap-$d/ic_launcher_round.png "$RES/mipmap-$d/ic_launcher_round.png"
  rm -f "$RES/mipmap-$d/ic_launcher_foreground.png"
done
# drop the adaptive-icon xml so the PNGs above are used on every Android version
rm -rf "$RES/mipmap-anydpi-v26"
