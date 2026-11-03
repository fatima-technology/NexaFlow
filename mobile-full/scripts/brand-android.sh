#!/usr/bin/env bash
# Replace Capacitor's default launcher icon with the NexaFlow icon (run after `cap add android`).
set -e
RES=android/app/src/main/res
BR=../mobile/branding
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  cp $BR/mipmap-$d/ic_launcher.png "$RES/mipmap-$d/ic_launcher.png"
  cp $BR/mipmap-$d/ic_launcher_round.png "$RES/mipmap-$d/ic_launcher_round.png"
  rm -f "$RES/mipmap-$d/ic_launcher_foreground.png"
done
rm -rf "$RES/mipmap-anydpi-v26"
