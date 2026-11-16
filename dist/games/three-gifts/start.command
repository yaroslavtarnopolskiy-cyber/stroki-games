#!/bin/sh
# macOS: double-click in Finder to run the game via a local server
cd "$(dirname "$0")" || exit 1
exec sh ./start.sh
