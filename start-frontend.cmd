@echo off
setlocal
cd /d E:\MyProgram\swarm
set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
echo [Swarm] Starting static frontend on http://127.0.0.1:6904
bun run dev:web
endlocal
