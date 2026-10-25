@echo off
setlocal
cd /d %~dp0
where py >nul 2>nul
if %errorlevel%==0 (py -3.11 -m venv .venv) else (python -m venv .venv)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if not exist .env copy .env.example .env
echo.
echo WEALTH OS local demo starting at http://127.0.0.1:8765
echo Demo login: demo / Demo1234!
echo Press Ctrl+C to stop.
python -m uvicorn server:app --host 127.0.0.1 --port 8765
pause
