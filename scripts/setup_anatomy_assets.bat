@echo off
cd /d "%~dp0.."
py -3 scripts\setup_anatomy_assets.py
if errorlevel 1 (
  echo.
  echo Anatomy asset setup failed. Check network access and retry.
  pause
  exit /b 1
)
echo.
echo Anatomy model setup completed.
pause
