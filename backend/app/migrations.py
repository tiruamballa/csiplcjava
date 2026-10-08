"""Small, safe, ADDITIVE migrations that run automatically every time the API starts.

Nothing here ever drops a table/column or deletes a row. Running it twice does nothing the second time.
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
    need_student_plc = "students" in tables and "plc_roll_number" not in student_cols

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

        if need_student_plc:
            conn.execute(text("ALTER TABLE students ADD COLUMN plc_roll_number VARCHAR(20)"))
            logger.warning("Database upgrade: added students.plc_roll_number")

        # Backfill any student missing a plc_roll_number permanently
        if "students" in tables:
            for lab_name, lab_code in [("Lab 1", "1"), ("Lab 2", "2")]:
                unassigned = conn.execute(
                    text("SELECT id FROM students WHERE lab = :lab AND (plc_roll_number IS NULL OR plc_roll_number = '') ORDER BY LOWER(roll_number)"),
                    {"lab": lab_name}
                ).all()
                if unassigned:
                    rows = conn.execute(
                        text("SELECT plc_roll_number FROM students WHERE lab = :lab AND plc_roll_number IS NOT NULL AND plc_roll_number != ''"),
                        {"lab": lab_name}
                    ).all()
                    max_num = 0
                    prefix = f"plc{lab_code}"
                    for (p,) in rows:
                        if p and p.lower().startswith(prefix):
                            digits = p[len(prefix):]
                            if digits.isdigit():
                                max_num = max(max_num, int(digits))

                    for idx, (sid,) in enumerate(unassigned, start=max_num + 1):
                        plc_code = f"{prefix}{idx:02d}"
                        conn.execute(
                            text("UPDATE students SET plc_roll_number = :plc WHERE id = :id"),
                            {"plc": plc_code, "id": sid}
                        )

    # Indexes (IF NOT EXISTS works on SQLite and PostgreSQL).
    if "students" in tables:
        with engine.begin() as conn:
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_students_lab ON students (lab)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_students_plc ON students (plc_roll_number)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_attendance_records_lab ON attendance_records (lab)"))
