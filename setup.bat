@echo off
REM ===== ONE-TIME SETUP (Windows). Double-click this file. Safe to run again. =====
cd /d "%~dp0backend"
if not exist venv\Scripts\python.exe (
  echo Creating Python environment...
  python -m venv venv
)
call venv\Scripts\activate
echo Installing backend packages...
pip install -r requirements.txt
echo.
echo Setting up the database (admin account, sample questions, students)...
python seed.py
echo.
cd /d "%~dp0frontend"
echo Installing website packages...
call npm install
echo.
echo ===== Setup finished. Now double-click start.bat =====
pause
