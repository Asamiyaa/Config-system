@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo [Opportunity OS] .venv is missing. Start run_windows.bat once.
  exit /b 1
)
".venv\Scripts\python.exe" -m app.collectors --due
endlocal
