#!/usr/bin/env bash
# ONE-TIME SETUP (macOS / Linux). Run:  bash setup.sh      Safe to run again.
set -e
cd "$(dirname "$0")/backend"
[ -d venv ] || python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed.py
cd ../frontend && npm install
echo "Setup finished. Now run:  bash start.sh"
