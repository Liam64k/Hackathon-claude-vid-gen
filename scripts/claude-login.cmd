@echo off
rem Opened by Studio's "Connect Claude": runs Claude Code's own sign-in; paste the code here. Studio never sees it.
set ANTHROPIC_API_KEY=
set ANTHROPIC_AUTH_TOKEN=
set CLAUDE_CODE_OAUTH_TOKEN=
echo.
echo   Studio: signing in to Claude Code. Approve in your browser; if a code is shown, paste it here.
echo.
"%~1" auth login
echo.
echo   Done. Studio turns green by itself once you are signed in.
pause
