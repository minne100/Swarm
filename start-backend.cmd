@echo off
setlocal
cd /d E:\MyProgram\swarm
set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
echo [Swarm] Starting backend on http://127.0.0.1:3000
bun run --cwd packages/opencode --conditions=browser src/index.ts serve --hostname 127.0.0.1 --port 3000 --print-logs
endlocal
