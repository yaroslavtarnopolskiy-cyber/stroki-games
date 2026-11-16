#!/bin/sh
# Run the game via a local server (it cannot load from file://)
cd "$(dirname "$0")" || exit 1
URL=http://localhost:8000/index.html
(sleep 2; if command -v open >/dev/null 2>&1; then open "$URL"; else xdg-open "$URL"; fi) >/dev/null 2>&1 &
if command -v python3 >/dev/null 2>&1; then python3 -m http.server 8000; else python -m http.server 8000; fi
