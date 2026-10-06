"""End-to-end API checks.  Run from the backend folder:   pip install -r requirements-dev.txt  then  python tests/test_api.py
Uses a throw-away database, so it never touches your real data."""
import os, sys, tempfile
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{tmp}/test.db"
os.environ.setdefault("SECRET_KEY", "x" * 48)

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models import Admin  # noqa: E402
from app.auth.password import hash_password  # noqa: E402
from app.config import today_local  # noqa: E402
import seed  # noqa: E402

db = SessionLocal()
db.add(Admin(name="T", email="t@t.com", password_hash=hash_password("password12345")))
db.commit()
seed.seed_students(db)
db.close()

c = TestClient(app)
ok = 0
def check(name, cond, extra=""):
    global ok
    assert cond, f"FAIL: {name} {extra}"
    ok += 1
    print("  ok -", name)

# ---- auth
check("admin API rejects no token", c.get("/admin/students").status_code == 401)
check("attendance API rejects no token", c.get("/admin/attendance/report").status_code == 401)
check("add-question rejects no token", c.post("/assignments", json={}).status_code == 401)
check("student can't change lab w/o token", c.patch("/admin/students/1/lab", json={"lab": "Lab 2"}).status_code == 401)
check("wrong password", c.post("/admin/login", json={"password": "nope"}).status_code == 401)
check("correct password login works", c.post("/admin/login", json={"password": "tiru2007"}).status_code == 200)
tok = c.post("/admin/login", json={"password": "tiru2007"}).json()["access_token"]
H = {"Authorization": f"Bearer {tok}"}

# ---- seed data
studs = c.get("/admin/students", headers=H).json()
l1 = [s for s in studs if s["lab"] == "Lab 1"]; l2 = [s for s in studs if s["lab"] == "Lab 2"]
check("76 unique students (77 entries, 1 duplicate)", len(studs) == 76, len(studs))
check("Lab 1 = 40, Lab 2 = 36", (len(l1), len(l2)) == (40, 36), (len(l1), len(l2)))
check("no duplicate reg numbers", len({s["roll_number"].lower() for s in studs}) == 76)
dup = [s for s in studs if s["roll_number"] == "25B91A0554"]
check("25B91A0554 exists once, correct name", len(dup) == 1 and dup[0]["name"] == "CHANCHALI SRIVALLI MOKSHAGNA")
check("reg numbers kept as supplied (lower-case one)", any(s["roll_number"] == "25b91a6140" for s in studs))
check("lab filter works", len(c.get("/admin/students?lab=Lab 2", headers=H).json()) == 36)
check("overview counts are dynamic", c.get("/admin/attendance/stats/overview", headers=H).json()["lab2"] == 36)

# ---- student CRUD
r = c.post("/admin/students", headers=H, json={"roll_number": "TEST001", "name": "Student A", "lab": "Lab 1"})
check("create student", r.status_code == 201 and r.json()["lab"] == "Lab 1")
A = r.json()["id"]
check("duplicate reg (case-insensitive) rejected", c.post("/admin/students", headers=H, json={"roll_number": "test001", "name": "x"}).status_code == 409)
check("invalid lab rejected", c.post("/admin/students", headers=H, json={"roll_number": "T2", "name": "x", "lab": "Lab 3"}).status_code == 422)
check("edit student", c.put(f"/admin/students/{A}", headers=H, json={"roll_number": "TEST001", "name": "Student A2"}).json()["name"] == "Student A2")
b = c.post("/admin/students/bulk", headers=H, json={"students": [
    {"roll_number": "B1", "name": "Bulk One", "lab": "Lab 2"}, {"roll_number": "b1", "name": "Dup"},
    {"roll_number": "TEST001", "name": "Existing"}, {"roll_number": "", "name": "No reg"}, {"roll_number": "B3", "name": "X", "lab": "Lab 9"}]}).json()
check("bulk: 1 created, 2 skipped, 2 rejected", (b["created"], len(b["skipped"]), len(b["rejected"])) == (1, 2, 2), b)

# ---- CRITICAL TEST: lab switch keeps attendance
today = today_local()
d1, d2 = (today - timedelta(days=1)).isoformat(), today.isoformat()
def save(date, lab, rows): return c.put(f"/admin/attendance/{date}", headers=H, json={"lab": lab, "records": rows})
r = save(d1, "Lab 1", [{"student_id": A, "status": "Present"}]); check("day 1 saved Present", r.status_code == 200, r.text)
r = save(d2, "Lab 1", [{"student_id": A, "status": "Absent"}]); check("day 2 saved Absent", r.status_code == 200, r.text)
rep = lambda lab="": {s["id"]: s for s in c.get(f"/admin/attendance/report{lab}", headers=H).json()["students"]}
a = rep()[A]; check("before: 1P 1A total 2 = 50%", (a["present"], a["absent"], a["total"], a["percentage"], a["lab"]) == (1, 1, 2, 50.0, "Lab 1"), a)
r = c.patch(f"/admin/students/{A}/lab", headers=H, json={"lab": "Lab 2"}); check("change lab -> Lab 2", r.status_code == 200 and r.json()["lab"] == "Lab 2")
a = rep()[A]; check("AFTER: still 1P 1A total 2 = 50%, now Lab 2", (a["present"], a["absent"], a["total"], a["percentage"], a["lab"]) == (1, 1, 2, 50.0, "Lab 2"), a)
check("student listed under Lab 2 not Lab 1", A in rep("?lab=Lab 2") and A not in rep("?lab=Lab 1"))
check("report keeps 50% when filtered by Lab 2", rep("?lab=Lab 2")[A]["percentage"] == 50.0)

# history stays under the lab it was taken in
sess = c.get("/admin/attendance/sessions", headers=H).json()
s1 = [s for s in sess if s["session_date"] == d1 and s["lab"] == "Lab 1"][0]
check("history: old day still Lab 1 (1 present)", s1["present"] == 1, sess)
# reopening the OLD Lab 1 sheet still shows the moved student
day = c.get(f"/admin/attendance/{d1}?lab=Lab 1", headers=H).json()
row = [r for r in day["students"] if r["student_id"] == A]
check("old Lab 1 sheet still lists moved student as Present", row and row[0]["status"] == "Present" and day["saved"])
# Lab 2 sheet for same date: moved student is locked (already marked in Lab 1) and not overwritten
day2 = c.get(f"/admin/attendance/{d1}?lab=Lab 2", headers=H).json()
row = [r for r in day2["students"] if r["student_id"] == A][0]
check("Lab 2 sheet shows moved student read-only", row["locked"] and row["status"] == "Present")
r = save(d1, "Lab 2", [{"student_id": A, "status": "Absent"}, {"student_id": l2[0]["id"], "status": "Present"}]).json()
check("saving Lab 2 skipped the locked student", r["skipped"] == 1)
check("...and old record unchanged", rep()[A]["present"] == 1)

# ---- normal lab attendance flow + update + delete
r = save(d2, "Lab 2", [{"student_id": s["id"], "status": "Present"} for s in l2]); check("Lab 2 attendance saved", r.status_code == 200)
r = save(d2, "Lab 2", [{"student_id": l2[0]["id"], "status": "Absent"}]); check("update attendance", r.status_code == 200)
day = c.get(f"/admin/attendance/{d2}?lab=Lab 2", headers=H).json()
check("update persisted", [x for x in day["students"] if x["student_id"] == l2[0]["id"]][0]["status"] == "Absent")
d0 = (today - timedelta(days=2)).isoformat()
check("student in wrong lab can't be added", save(d0, "Lab 1", [{"student_id": l2[1]["id"], "status": "Present"}]).status_code == 400)
check("student already marked in other lab is skipped, not overwritten", save(d2, "Lab 1", [{"student_id": l2[1]["id"], "status": "Present"}]).json()["skipped"] == 1)
check("future date rejected", save((today + timedelta(days=1)).isoformat(), "Lab 2", [{"student_id": A, "status": "Present"}]).status_code == 400)
check("delete Lab 2 session", c.delete(f"/admin/attendance/{d2}?lab=Lab 2", headers=H).status_code == 204)
check("Lab 1 record on same date survives delete of Lab 2", rep()[A]["total"] == 2)

# ---- questions CRUD + public visibility
q = {"day_number": 4, "title": "Q4", "description": "d", "difficulty": "Easy", "question_link": "https://example.com/x", "assignment_date": d2}
r = c.post("/assignments", headers=H, json=q); check("add question", r.status_code == 201); qid = r.json()["id"]
check("question visible publicly (no login)", any(x["id"] == qid for x in c.get("/assignments").json()))
check("edit question", c.put(f"/assignments/{qid}", headers=H, json={**q, "title": "Q4b"}).json()["title"] == "Q4b")
c.post("/assignments", headers=H, json={**q, "title": "Future", "assignment_date": (today + timedelta(days=5)).isoformat()})
check("future question hidden from public", not any(x["title"] == "Future" for x in c.get("/assignments").json()))
check("search by title in admin list", any(x["title"] == "Future" for x in c.get("/admin/assignments", headers=H).json()))
check("delete question", c.delete(f"/assignments/{qid}", headers=H).status_code == 204)

# ---- delete student
check("delete student", c.delete(f"/admin/students/{A}", headers=H).status_code == 204)
print(f"\nALL {ok} CHECKS PASSED")
