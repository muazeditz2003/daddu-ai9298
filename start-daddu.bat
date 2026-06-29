@echo off
title DADDU AI Server
cd /d "%~dp0"
echo Starting DADDU AI Server...
echo.
npx tsx server.ts
pause
