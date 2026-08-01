@echo off
setlocal
cd /d "%~dp0"
set COLLI_BRIDGE_KEY=teste-chave-local
set PORT=10000
node server.mjs
pause
