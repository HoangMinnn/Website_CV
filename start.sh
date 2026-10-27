#!/usr/bin/env bash
# AI Lab launcher for macOS / Linux:  ./start.sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "[X] Node.js is not installed. Get the LTS version at https://nodejs.org and run this again."
  exit 1
fi
exec node scripts/start.mjs "$@"
