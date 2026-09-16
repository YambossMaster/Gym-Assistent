@echo off
setlocal
cd /d "%~dp0"
set "APP_PATH=/today"
if /I "%~1"=="mobile" set "APP_PATH=/mobile-preview.html"

where npm >nul 2>nul
if errorlevel 1 (
  echo Gym Assistant requires Node.js 22 or newer.
  echo Install Node.js, then double-click this file again.
  pause
  exit /b 1
)

where powershell >nul 2>nul
if errorlevel 1 (
  echo Gym Assistant requires Windows PowerShell to check local service readiness.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing Gym Assistant dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Review the message above and try again.
    pause
    exit /b 1
  )
)

call powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wait-local-service.ps1" -Service api -TimeoutSeconds 0
if errorlevel 1 (
  echo Starting the Gym Assistant API in a separate window...
  start "Gym Assistant API" cmd /k ""%~dp0scripts\run-local-api.cmd""
)

echo Waiting for the local API at http://127.0.0.1:3000/health...
call powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wait-local-service.ps1" -Service api -TimeoutSeconds 30
if errorlevel 1 (
  echo.
  echo The API did not become ready. The Web app will not open without it.
  echo Check the "Gym Assistant API" window for the startup error, then try again.
  pause
  exit /b 1
)

call powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wait-local-service.ps1" -Service web -TimeoutSeconds 0
if not errorlevel 1 (
  echo Reusing the running Gym Assistant Web app at http://127.0.0.1:5173%APP_PATH%
  start "" "http://127.0.0.1:5173%APP_PATH%"
  exit /b 0
)

echo Starting Gym Assistant at http://127.0.0.1:5173
echo Keep both this window and the API window open while using the application.
call npm run dev --workspace @gym-assistant/web -- --open %APP_PATH%

if errorlevel 1 pause
