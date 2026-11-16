@echo off
rem Run the game via a local server (it cannot load from file://)
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8000/index.html"
py -m http.server 8000 || python -m http.server 8000
