@echo off
title Studio (live) - keep this window open, close it to stop Studio
cd /d "%~dp0"
set "NODE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE%" set "NODE=node"
"%NODE%" app\server.mjs
echo.
echo Studio stopped. If you saw an error above, run "npm run doctor" in this folder.
pause
