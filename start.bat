@echo off
chcp 65001 >nul
title AI Lab
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [X] Chua cai Node.js. Tai ban LTS tai: https://nodejs.org  roi chay lai file nay.
  echo.
  pause
  exit /b 1
)
node scripts\start.mjs %*
pause
