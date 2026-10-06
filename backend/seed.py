"""Creates the first admin account (password hashed with bcrypt), sample questions and the initial students.

Safe to run again at any time: it never creates duplicates and never changes existing students
(so it will NOT undo a lab change you made in the Admin UI).

Run from the backend folder:   python seed.py
Non-interactive:  set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD in the environment first.
"""
import getpass
import os
from datetime import timedelta

from sqlalchemy import select

from app.auth.password import hash_password
from app.config import today_local
from app.database import Base, SessionLocal, engine
from app.migrations import run_migrations
from app.models import Admin, Assignment, Student
from app.seed_data import build_initial_students

SAMPLES = [
    (1, "Check if a Number is Even or Odd",
     "Read an integer and print whether it is even or odd using the % operator and if-else.",
     "Easy", "https://www.hackerrank.com/challenges/java-if-else/problem"),
    (1, "Reverse a Number",
     "Given an integer, reverse its digits using a loop with % and / operations. Handle negative numbers.",
     "Easy", "https://leetcode.com/problems/reverse-integer/"),
    (1, "Palindrome Number",
     "Given an integer x, return true if x reads the same backward as forward, without converting it to a string.",
     "Easy", "https://leetcode.com/problems/palindrome-number/"),
    (2, "Find Maximum Element in an Array",
     "Given an array of integers, find the largest element with a single pass over the array.",
     "Easy", "https://leetcode.com/problems/largest-number-at-least-twice-of-others/"),
    (2, "Reverse an Array",
     "Reverse the elements of an array in place using the two-pointer technique, without extra space.",
     "Easy", "https://leetcode.com/problems/reverse-string/"),
    (2, "Linear Search",
     "Search for a target in an unsorted array and return its index, or -1 if it is not present.",
     "Easy", "https://www.geeksforgeeks.org/linear-search/"),
    (3, "Two Sum",
     "Given an array of integers and a target, return the indices of the two numbers that add up to the target.",
     "Easy", "https://leetcode.com/problems/two-sum/"),
    (3, "Contains Duplicate",
     "Return true if any value appears at least twice in the array. Try it with a HashSet.",
     "Easy", "https://leetcode.com/problems/contains-duplicate/"),
    (3, "Valid Palindrome",
     "After lowercasing and removing non-alphanumeric characters, check whether the phrase is a palindrome.",
     "Easy", "https://leetcode.com/problems/valid-palindrome/"),
]


def seed_students(db) -> None:
    """Insert the initial student list. Existing registration numbers are skipped, never overwritten."""
    students, notes = build_initial_students()
    existing = {r.lower() for r in db.scalars(select(Student.roll_number)).all()}
    added = {"Lab 1": 0, "Lab 2": 0}
    skipped = 0
    for s in students:
        if s["roll_number"].lower() in existing:
            skipped += 1
            continue
        db.add(Student(roll_number=s["roll_number"], name=s["name"], lab=s["lab"]))
        added[s["lab"]] += 1
    db.commit()
    print(f"Students: added {sum(added.values())} (Lab 1: {added['Lab 1']}, Lab 2: {added['Lab 2']}); "
          f"{skipped} already existed and were left untouched.")
    for n in notes:
        print("  NOTE:", n)


def main():
    run_migrations(engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        have_admin = db.scalar(select(Admin.id).limit(1)) is not None
        wants_admin = bool(os.getenv("ADMIN_EMAIL"))
        if have_admin and not wants_admin:
            # An admin already exists (e.g. you are upgrading): don't ask for a new one unless you want one.
            answer = input("An admin account already exists. Create another admin? (y/N): ").strip().lower()
            wants_admin = answer in ("y", "yes")

        if wants_admin or not have_admin:
            name = os.getenv("ADMIN_NAME") or input("Admin name: ").strip()
            email = (os.getenv("ADMIN_EMAIL") or input("Admin email: ").strip()).lower()
            password = os.getenv("ADMIN_PASSWORD") or getpass.getpass("Admin password (min 10 chars): ")

            if not name or "@" not in email:
                raise SystemExit("A name and a valid email are required.")
            if len(password) < 10:
                raise SystemExit("Password must be at least 10 characters.")
            if len(password.encode()) > 72:
                raise SystemExit("Password must be at most 72 bytes (bcrypt limit).")

            if db.scalar(select(Admin).where(Admin.email == email)):
                print(f"Admin {email} already exists - skipped.")
            else:
                db.add(Admin(name=name, email=email, password_hash=hash_password(password)))
                db.commit()
                print(f"Created admin {email}")

        if db.scalar(select(Assignment.id).limit(1)) is None:
            today = today_local()
            # Day 3 = today, Day 2 = yesterday, Day 1 = two days ago
            for day, title, desc, diff, link in SAMPLES:
                db.add(Assignment(
                    day_number=day, title=title, description=desc, difficulty=diff,
                    question_link=link, assignment_date=today - timedelta(days=3 - day),
                ))
            db.commit()
            print(f"Added {len(SAMPLES)} sample assignments (Days 1-3).")
        else:
            print("Assignments already exist - sample data skipped.")

        seed_students(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
