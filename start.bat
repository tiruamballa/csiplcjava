@echo off
REM ===== START THE WEBSITE (Windows). Double-click this file. =====
start "Backend (keep open)" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn app.main:app --reload"
start "Website (keep open)" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 6 >nul
start http://localhost:5173
echo Website:   http://localhost:5173
echo Admin:     http://localhost:5173/admin/login
echo Close the two black windows to stop the website.
