"""Small, safe, ADDITIVE migrations that run automatically every time the API starts.

Nothing here ever drops a table/column or deletes a row. Running it twice does nothing the second time.

Upgrade from the first version of the project:
  1. students.lab                -> new column. Existing students get their lab from the initial list
                                    (first 40 = Lab 1, the rest = Lab 2); anyone not in that list becomes Lab 1.
                                    Change any of them later from Admin -> Students -> Change Lab.
  2. attendance_records.lab      -> new column. Filled in from the student's lab at upgrade time so the
                                    attendance history can be shown per lab. Attendance rows are not changed otherwise.
"""
import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.seed_data import initial_lab_by_reg

logger = logging.getLogger("java_for_dsa")


def run_migrations(engine: Engine) -> None:
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    student_cols = {c["name"] for c in insp.get_columns("students")} if "students" in tables else set()
    record_cols = (
        {c["name"] for c in insp.get_columns("attendance_records")} if "attendance_records" in tables else set()
    )

    need_student_lab = "students" in tables and "lab" not in student_cols
    need_record_lab = "attendance_records" in tables and "lab" not in record_cols
    if not (need_student_lab or need_record_lab):
        return

    with engine.begin() as conn:  # one transaction: all-or-nothing
        if need_student_lab:
            conn.execute(text("ALTER TABLE students ADD COLUMN lab VARCHAR(10) NOT NULL DEFAULT 'Lab 1'"))
            known = initial_lab_by_reg()
            for sid, reg in conn.execute(text("SELECT id, roll_number FROM students")).all():
                lab = known.get((reg or "").strip().lower(), "Lab 1")
                conn.execute(text("UPDATE students SET lab = :lab WHERE id = :id"), {"lab": lab, "id": sid})
            logger.warning("Database upgrade: added students.lab")

        if need_record_lab:
            conn.execute(text("ALTER TABLE attendance_records ADD COLUMN lab VARCHAR(10)"))
            conn.execute(text(
                "UPDATE attendance_records SET lab = "
                "(SELECT students.lab FROM students WHERE students.id = attendance_records.student_id) "
                "WHERE lab IS NULL"
            ))
            logger.warning("Database upgrade: added attendance_records.lab")

    # Indexes (IF NOT EXISTS works on SQLite and PostgreSQL).
    with engine.begin() as conn:
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_students_lab ON students (lab)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_attendance_records_lab ON attendance_records (lab)"))
