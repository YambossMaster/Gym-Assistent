@echo off
cd /d "%~dp0.."
call npm run dev:api
echo.
echo Gym Assistant API stopped. Check the error above before restarting the app.
