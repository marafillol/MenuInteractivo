@echo off
setlocal
cd /d "%~dp0"
set "MODO_SERVIDOR=local"
echo Iniciando Menu Interactivo en modo local...
npm.cmd start
pause
