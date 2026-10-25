#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
if [[ ! -f .env ]]; then cp .env.example .env; fi
printf '\nWEALTH OS local demo: http://127.0.0.1:8765\nDemo login: demo / Demo1234!\nPress Ctrl+C to stop.\n\n'
python -m uvicorn server:app --host 127.0.0.1 --port 8765
