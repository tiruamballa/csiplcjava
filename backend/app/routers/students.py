from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.jwt import get_current_admin
from app.core.plc import get_plc_roll_map
from app.database import get_db
from app.models.student import Student
from app.schemas.student import (
    BulkProblem, BulkResult, LabChange, Lab, StudentBulk, StudentIn, StudentOut, StudentUpdate,
)

# Every route here requires a valid admin JWT.
router = APIRouter(prefix="/admin/students", tags=["students"], dependencies=[Depends(get_current_admin)])


def _roll_taken(db: Session, roll: str, exclude_id: int | None = None) -> bool:
    """Registration numbers are unique ignoring upper/lower case (25b91a6140 == 25B91A6140)."""
    stmt = select(Student.id).where(func.lower(Student.roll_number) == roll.lower())
    if exclude_id is not None:
        stmt = stmt.where(Student.id != exclude_id)
    return db.scalar(stmt) is not None


def _get_or_404(db: Session, student_id: int) -> Student:
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found.")
    return student


@router.get("", response_model=list[StudentOut])
def list_students(lab: Lab | None = Query(default=None), db: Session = Depends(get_db)):
    stmt = select(Student).order_by(func.lower(Student.roll_number))
    if lab:
        stmt = stmt.where(Student.lab == lab)
    students = db.scalars(stmt).all()
    plc_map = get_plc_roll_map(db)
    result = []
    for s in students:
        so = StudentOut.model_validate(s)
        so.plc_roll_number = plc_map.get(s.id, "")
        result.append(so)
    return result


@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def add_student(data: StudentIn, db: Session = Depends(get_db)):
    if _roll_taken(db, data.roll_number):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Registration number {data.roll_number} already exists.")
    student = Student(**data.model_dump())
    db.add(student)
    db.commit()
    db.refresh(student)
    plc_map = get_plc_roll_map(db)
    so = StudentOut.model_validate(student)
    so.plc_roll_number = plc_map.get(student.id, "")
    return so


@router.post("/bulk", response_model=BulkResult)
def add_students_bulk(data: StudentBulk, db: Session = Depends(get_db)):
    """Add many students. Valid lines are saved; duplicates and invalid lines are reported back."""
    seen = {r.lower() for r in db.scalars(select(Student.roll_number)).all()}
    created, skipped, rejected = 0, [], []
    for item in data.students:
        try:
            s = StudentIn(roll_number=item.roll_number, name=item.name, lab=item.lab)
        except ValidationError as e:
            err = e.errors()[0]
            field = err["loc"][0] if err["loc"] else ""
            if field == "lab":
                reason = "Lab must be 'Lab 1' or 'Lab 2'."
            elif err["type"] in ("string_too_short", "missing"):
                reason = "Registration number and name are both required."
            else:
                reason = err["msg"].removeprefix("Value error, ")
            rejected.append(BulkProblem(roll_number=item.roll_number or "(blank)", reason=reason))
            continue
        if s.roll_number.lower() in seen:
            skipped.append(s.roll_number)
            continue
        seen.add(s.roll_number.lower())
        db.add(Student(**s.model_dump()))
        created += 1
    db.commit()
    return BulkResult(created=created, skipped=skipped, rejected=rejected)


@router.put("/{student_id}", response_model=StudentOut)
def update_student(student_id: int, data: StudentUpdate, db: Session = Depends(get_db)):
    student = _get_or_404(db, student_id)
    if _roll_taken(db, data.roll_number, exclude_id=student_id):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Registration number {data.roll_number} already exists.")
    student.roll_number, student.name = data.roll_number, data.name
    if data.lab:
        student.lab = data.lab
    db.commit()
    db.refresh(student)
    plc_map = get_plc_roll_map(db)
    so = StudentOut.model_validate(student)
    so.plc_roll_number = plc_map.get(student.id, "")
    return so


@router.patch("/{student_id}/lab", response_model=StudentOut)
def change_lab(student_id: int, data: LabChange, db: Session = Depends(get_db)):
    """Move a student to another lab. ONLY students.lab changes - attendance records are not touched."""
    student = _get_or_404(db, student_id)
    student.lab = data.lab
    db.commit()
    db.refresh(student)
    plc_map = get_plc_roll_map(db)
    so = StudentOut.model_validate(student)
    so.plc_roll_number = plc_map.get(student.id, "")
    return so


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = _get_or_404(db, student_id)
    db.delete(student)  # also deletes their attendance records
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
