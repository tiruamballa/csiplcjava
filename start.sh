#!/usr/bin/env bash
# START THE WEBSITE (macOS / Linux). Run:  bash start.sh      Press Ctrl+C to stop.
cd "$(dirname "$0")"
(cd backend && source venv/bin/activate && uvicorn app.main:app --reload) &
(cd frontend && npm run dev) &
echo "Website: http://localhost:5173   Admin: http://localhost:5173/admin/login"
wait
