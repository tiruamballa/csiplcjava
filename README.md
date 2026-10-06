# 🚀 Java for Problem Solving Skills

Students open the website, see the day's Java problems and click **Solve Problem →** (opens the external platform in a new tab). **No student login.**
Admins log in at `/admin/login` and run everything from the browser: **questions, students, labs, attendance, reports, CSV export.** You never edit code for daily work.

**Stack:** React + Vite · FastAPI + SQLAlchemy + SQLite (PostgreSQL-ready) · JWT + bcrypt · Axios · React Router

---

## 1. Run it on your computer

You need **Python 3.10+** and **Node.js 18+** installed.

### Windows (easiest)
1. Double-click **`setup.bat`** (only once; wait until it says "Setup finished"). If it asks *"Create another admin?"* type `n` (your existing admin keeps working). On a brand-new install it asks you to create the admin name, email and password (min 10 characters).
2. Double-click **`start.bat`**. Two black windows open (keep them open) and your browser opens the site.

### macOS / Linux
```bash
bash setup.sh     # once
bash start.sh     # every time
```

### Manual commands (any system)
```bash
# Terminal 1 - backend
cd backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python seed.py                 # admin + sample questions + the 76 students (safe to re-run)
uvicorn app.main:app --reload

# Terminal 2 - website
cd frontend
npm install
npm run dev
```

| What | Address |
|---|---|
| Student website | http://localhost:5173 |
| Admin login | http://localhost:5173/admin/login |
| API docs (not needed day-to-day) | http://localhost:8000/docs |

### Environment variables
`backend/.env` (`.env.example` shows all options):

| Variable | Meaning |
|---|---|
| `SECRET_KEY` | Long random text used to sign logins. **Required** (the app refuses to start with a weak one). |
| `DATABASE_URL` | Default `sqlite:///./java_for_dsa.db` (a single file). Use PostgreSQL when hosting online. |
| `CORS_ORIGINS` | Website addresses allowed to talk to the backend (comma-separated). |
| `TIMEZONE` | Default `Asia/Kolkata`. Decides when a question's date "arrives" and what "today" is. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | How long an admin stays logged in (default 480 = 8 hours). |

`frontend/.env`: `VITE_API_URL=http://localhost:8000` (address of the backend).

---

## 2. Upgrading an existing database (automatic)

If you already have `backend/java_for_dsa.db` from the previous version, **just start the backend as usual.** On startup it:

1. saves a backup copy next to it (`java_for_dsa.db.backup-before-lab-upgrade-<time>`),
2. adds the new **lab** columns (nothing is deleted or rewritten),
3. gives each existing student a lab (students from the supplied list get their list lab: first 40 = Lab 1, rest = Lab 2; anyone else = Lab 1 — change them in **Students → Change Lab**),
4. keeps every attendance record, question and admin account exactly as it was.

It only does this once; later starts do nothing. **Never delete `java_for_dsa.db`.**

Then run `python seed.py` (or `setup.bat`) once to load the initial student list. It never overwrites students that already exist and never creates duplicates, so it will not undo a lab change you made. (If you deliberately delete a seeded student and re-run `seed.py`, that student is added back.)

### About the duplicate student
`25B91A0554` appeared twice ("Ch SrivalliMokshagna" with an e-mail-style number, and "CHANCHALI SRIVALLI MOKSHAGNA"). Registration numbers are unique, so **one** student was created: **CHANCHALI SRIVALLI MOKSHAGNA**, **Lab 1** (the first entry's position decides the lab). The seed prints a note about it. If the name or lab should be different: **Students → Edit / Change Lab**. The initial list therefore has **76** students (Lab 1: 40, Lab 2: 36).
Registration numbers are stored exactly as supplied (e.g. `25b91a6140` stays lower-case); duplicates are detected ignoring upper/lower case.

---

## 3. Daily workflow (all in the browser)

### Add a question (before class)
1. Open `/admin/login` and log in.
2. **Questions → + Add Question**.
3. Fill in **Day, Date, Question title, Question description, Difficulty, Question URL**.
4. Click **Add Question**. It is live immediately if the date is today (a future date = scheduled, hidden from students until that day).

After adding, Day and Date stay filled so you can enter the next question for the same day quickly. **Questions** lists everything (search, filter by day, live/scheduled) with **Edit** and **Delete** (asks for confirmation).

### Take attendance
1. **Attendance**.
2. Pick the **Date** and **Lab 1** (or **Lab 2**) — only that lab's students appear.
3. Everyone starts as Present; tap **Absent** for absentees (or use **All Present / All Absent**; search by name or registration number).
4. **Save Attendance**. Then switch to **Lab 2** and do the same.
5. Made a mistake? Reopen the same date + lab and press **Update Attendance**, or use **Attendance Sessions** (below the sheet) → **Open / Edit** or **Delete**.

### See the report / export
**Attendance Report** → choose **All Labs / Lab 1 / Lab 2**, sort (registration number, lowest, highest, name) → **Export CSV**. The CSV matches the filter and has: Registration Number, Name, Lab, Present, Absent, Total Sessions, Attendance Percentage.

### Change a student's lab
**Students →** find the student (search or lab filter) **→ Change Lab →** confirm. Their attendance (Present/Absent counts and percentage) does **not** change; only their current lab does.

### Add / edit / delete students
**Students** page: *Add a student* (registration number, name, lab), or *Add many students at once* (paste one per line: `25B91A1234, Student Name` or `25B91A1234, Student Name, Lab 2`; pasting from Excel works). Duplicates are skipped and reported. **Edit** and **Delete** are on every row. *Delete removes the student's attendance too* (a warning is shown) — to move a student, use **Change Lab** instead.

---

## 4. How lab changes keep attendance safe

* A student is **one row** in the database with a *current* `lab` (`Lab 1` or `Lab 2`).
* Every attendance record points to the student's **database id** (`student_id`), never to a lab or name.
* The report counts all of a student's records, whichever lab they were taken in, so **Percentage = Present ÷ Total sessions × 100** never changes when a student moves.
* Each record also remembers which lab sheet it was taken on. That is used **only** to show history ("08 Oct — Lab 1: 38 Present / 2 Absent") and to reopen an old sheet exactly as it was. It is never changed by a lab move.
* If a student moves labs mid-day, they appear read-only in the new lab's sheet for that date (already marked in the old lab), so the old record can't be overwritten by accident.

---

## 5. Testing

```bash
cd backend
pip install -r requirements-dev.txt
python tests/test_api.py      # 44 checks on a temporary database (your real data is not touched)
cd ../frontend
npm run build
```
The tests include the critical one: Student A (Lab 1) Present + Absent → move to Lab 2 → still Present 1 / Absent 1 / Total 2 / 50%.

---

## 6. API (admin routes need `Authorization: Bearer <token>`)

| Method | Path | Auth |
|---|---|---|
| GET | `/assignments`, `/assignments/today`, `/assignments/day/{n}`, `/assignments/{id}` | public (only questions whose date has arrived) |
| POST | `/admin/login` | public → JWT |
| GET | `/admin/me`, `/admin/assignments` | admin |
| POST / PUT / DELETE | `/assignments`, `/assignments/{id}` | admin |
| GET / POST | `/admin/students` (`?lab=Lab 1`), `/admin/students/bulk` | admin |
| PUT / DELETE | `/admin/students/{id}` | admin |
| PATCH | `/admin/students/{id}/lab` | admin |
| GET | `/admin/attendance/sessions`, `/admin/attendance/report?lab=`, `/admin/attendance/stats/overview` | admin |
| GET / PUT / DELETE | `/admin/attendance/{date}?lab=Lab 1` | admin |

## 7. Security
* Passwords: bcrypt hashes only, never returned. No credentials in the React code.
* Every admin route checks the JWT on the **server** (hiding buttons is not what protects data). Students have no way to create, edit or delete anything.
* Question links must be `http(s)://`. CSV export neutralises spreadsheet-formula text. CORS only allows `CORS_ORIGINS`.
* Add more admins by running `python seed.py` and answering `y` to "Create another admin?".

## 8. Deploying (Vercel + a backend host)
* **Database:** use PostgreSQL (Neon / Supabase / Render) — free hosts wipe SQLite files. `pip install psycopg2-binary`, add it to `requirements.txt`, set `DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DBNAME`. The lab upgrade runs automatically on start. Then run `python seed.py` **once** against it (set `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) to create the admin and load the students.
* **Backend (Render / Railway):** root `backend`; build `pip install -r requirements.txt`; start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Env: `SECRET_KEY`, `DATABASE_URL`, `TIMEZONE`, `CORS_ORIGINS=https://your-site.vercel.app`.
* **Frontend (Vercel):** root `frontend`; build `npm run build`; output `dist`; env `VITE_API_URL=https://your-backend-domain`. `vercel.json` handles page refresh on `/admin/...`.
* Order: deploy backend → deploy frontend with its URL → add that URL to `CORS_ORIGINS`.
* This update changes both the frontend and the backend, so redeploy **both once**. After that, daily changes (questions, students, labs, attendance) need **no redeploy**.

## 9. Project layout
```
backend/app/   main.py · config.py · database.py · migrations.py · seed_data.py
               models/ · schemas/ · routers/ (auth, admin, assignments, students, attendance) · auth/
backend/       seed.py · tests/ · requirements.txt · .env
frontend/src/  pages/ · components/ (AdminLayout, attendance/…) · services/api.js · context/ · hooks/
setup.bat / start.bat   (Windows one-click)        setup.sh / start.sh (macOS/Linux)
```
