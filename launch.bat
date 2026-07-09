@echo off
setlocal
title Print Ready

cd /d "%~dp0"

REM ---- Always rebuild so the app never runs on stale code ----
echo.
echo === Building latest version — this takes about 30 seconds ===
echo.
call npm run build
if errorlevel 1 (
  echo.
  echo Build failed. See errors above.
  pause
  exit /b 1
)

echo.
echo =========================================
echo   Print Ready is opening...
echo   URL: http://localhost:3100
echo.
echo   Close this window to stop the server.
echo =========================================
echo.

REM Open the browser 4 seconds after the server starts (gives it time to boot)
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3100"

REM Start the production server in the foreground, on port 3100 so it never
REM collides with the Etsy SEO Generator (which defaults to 3000).
REM Closing this window kills the server.
call npm run start -- -p 3100
