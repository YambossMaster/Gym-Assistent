@echo off
cd /d "%~dp0.."
:restart
call npm run dev:api
if not errorlevel 1 exit /b 0
echo.
echo Gym Assistant API stopped unexpectedly. Restarting in 2 seconds...
timeout /t 2 /nobreak >nul
goto restart
