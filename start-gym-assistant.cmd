@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Gym Assistant requires Node.js 20 or newer.
  echo Install Node.js, then double-click this file again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing Gym Assistant dependencies...
  call npm ci
  if errorlevel 1 (
    echo Dependency installation failed. Review the message above and try again.
    pause
    exit /b 1
  )
)

echo Starting Gym Assistant at http://127.0.0.1:5173/today
echo Keep this window open while using the application.
call npm start

if errorlevel 1 pause
