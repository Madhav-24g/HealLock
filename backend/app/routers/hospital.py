from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Hospital, Patient, Staff, StaffRole, User, UserKind
from app.security import require_roles, require_staff

router = APIRouter(prefix="/hospital", tags=["hospital"])


@router.get("/me")
def me(pair=Depends(require_staff), db: Session = Depends(get_db)):
    _, staff = pair
    h = db.get(Hospital, staff.hospital_id)
    return {
        "staff_id": staff.id,
        "name": staff.name,
        "role": staff.role.value,
        "hospital": {"id": h.id, "name": h.name, "verification_status": h.verification_status},
    }


@router.get("/patients/lookup")
def lookup(health_id: str, pair=Depends(require_staff), db: Session = Depends(get_db)):
    _, staff = pair
    p = db.query(Patient).filter(Patient.health_id == health_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    identity = {"id": p.id, "name": p.name, "dob": str(p.dob), "health_id": p.health_id}
    if staff.role == StaffRole.receptionist:
        return identity
    return identity


@router.get("/staff")
def staff_list(pair=Depends(require_roles(StaffRole.admin)), db: Session = Depends(get_db)):
    _, staff = pair
    rows = db.query(Staff).filter(Staff.hospital_id == staff.hospital_id).all()
    return [{"id": s.id, "name": s.name, "role": s.role.value} for s in rows]
