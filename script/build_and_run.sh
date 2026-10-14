#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-run}"
case "$MODE" in run|--verify|--debug|--logs|--telemetry) ;; *) echo "Usage: $0 [--verify|--debug|--logs|--telemetry]" >&2; exit 2;; esac
# Only the app built in this checkout is stopped; installed copies are left alone.
APP_BUNDLE="$ROOT_DIR/build/HouseControl.app"
APP_BINARY="$APP_BUNDLE/Contents/MacOS/HouseControl"
for pid in $(pgrep -x HouseControl || true); do
  process_path="$(ps -p "$pid" -o comm=)"
  if [ "$process_path" = "$APP_BINARY" ]; then kill "$pid"; fi
done
"$ROOT_DIR/scripts/build-app.sh"
# open --env passes through test environments without changing global launch settings.
LAUNCH_ARGS=()
while IFS='=' read -r name value; do
  case "$name" in HOUSE_*) LAUNCH_ARGS+=(--env "$name=$value");; esac
done < <(env)
/usr/bin/open -n ${LAUNCH_ARGS[@]+"${LAUNCH_ARGS[@]}"} "$APP_BUNDLE"
case "$MODE" in
  --verify) sleep 2; pgrep -f "$APP_BINARY" >/dev/null; echo "Build and launch verified: $APP_BUNDLE";;
  --debug) sleep 1; lldb -n HouseControl;;
  --logs) /usr/bin/log stream --info --style compact --predicate 'process == "HouseControl"';;
  --telemetry) /usr/bin/log stream --info --style compact --predicate 'subsystem == "io.github.0xprobabillity.HouseControl"';;
esac
