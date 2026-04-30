@echo off
setlocal
cd /d "%~dp0"
set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
echo [Swarm] Starting frontend hot-reload server on http://127.0.0.1:6904 (root: frontend)
start "Swarm Frontend 6904" cmd /c "cd /d \"%~dp0\" && bunx live-server frontend --port=6904 --host=127.0.0.1 --no-browser"
echo [Swarm] Starting backend server with watch mode on http://127.0.0.1:3000
bun --watch backend/index.js
endlocal
