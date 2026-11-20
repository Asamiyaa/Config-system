@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo [1/3] Creating Python environment...
    py -3 -m venv .venv
    if errorlevel 1 (echo Python 3.10+ is required & pause & exit /b 1)
)
echo [2/3] Installing dependencies...
".venv\Scripts\python.exe" -m pip install -r requirements.txt --disable-pip-version-check
if errorlevel 1 (echo Dependency installation failed & pause & exit /b 1)
if not exist .env copy .env.example .env >nul
echo [3/3] Starting Opportunity OS; the browser opens automatically.
echo The built-in scheduler runs daily when this window is open.
".venv\Scripts\python.exe" -m app.launcher
pause
