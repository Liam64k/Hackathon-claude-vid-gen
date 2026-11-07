@echo off
title Studio (replay demo, no Claude usage) - keep this window open, close it to stop
cd /d "%~dp0"
set "NODE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE%" set "NODE=node"
"%NODE%" app\server.mjs --replay
echo.
echo Studio stopped.
pause
