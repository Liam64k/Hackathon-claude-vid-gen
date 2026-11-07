@echo off
title Studio Gen landing page - keep this window open, close it to stop
cd /d "%~dp0"
set "NODE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE%" set "NODE=node"
start "" "http://127.0.0.1:4600/"
"%NODE%" serve.mjs 4600
echo.
echo Preview stopped. If port 4600 was busy, another preview is probably already running.
pause
