import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import Hospital, Patient, Staff, StaffRole, User, UserKind
from app.schemas import TokenOut
from app.security import create_access_token, hash_password, verify_password
from app.services.blockchain import append_audit

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str
    kind: str = "patient"  # "patient" | "staff"
    role: str | None = "doctor"  # "doctor" | "pharmacist" | "emergency" | "receptionist" | "admin"
    blood_group: str | None = "O+"
    allergies: str | list[str] | None = None
    critical_meds: str | list[str] | None = None
    hospital_id: int | None = 1


@router.post("/register", response_model=TokenOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    clean_email = body.email.strip().lower()
    # Check if user already exists
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    hashed_pw = hash_password(body.password)
    user_kind = UserKind.patient if body.kind == "patient" else UserKind.staff
    patient_id = None
    staff_id = None
    role_str = "patient"

    if user_kind == UserKind.patient:
        clean_name = body.name.strip()
        tag = "".join(c for c in clean_name.split()[0].upper() if c.isalnum()) or "USER"
        count = db.query(Patient).count() + 1000
        unique_suffix = uuid.uuid4().hex[:4].upper()
        health_id = f"HL-{tag}-{count}"
        qr_token = f"QR-{tag}-{count}-{unique_suffix}"

        if isinstance(body.allergies, list):
            allergies_list = [str(a).strip() for a in body.allergies if str(a).strip()]
        elif isinstance(body.allergies, str) and body.allergies.strip():
            allergies_list = [a.strip() for a in body.allergies.split(",") if a.strip()]
        else:
            allergies_list = ["None Reported"]

        if isinstance(body.critical_meds, list):
            meds_list = [str(m).strip() for m in body.critical_meds if str(m).strip()]
        elif isinstance(body.critical_meds, str) and body.critical_meds.strip():
            meds_list = [m.strip() for m in body.critical_meds.split(",") if m.strip()]
        else:
            meds_list = ["None"]

        patient = Patient(
            name=clean_name,
            dob=date(1995, 1, 1),
            health_id=health_id,
            qr_token=qr_token,
            emergency_profile={
                "blood_group": (body.blood_group or "O+").strip().upper(),
                "allergies": allergies_list or ["None Reported"],
                "critical_meds": meds_list or ["None"],
                "critical_conditions": ["General Registered Patient"],
                "emergency_contacts": [{"name": "Emergency Contact", "phone": "+1-800-555-0199"}],
                "insurance": {
                    "provider": "National Health Shield",
                    "policy_number": f"NHS-{count}89",
                    "group_id": "GRP-90112",
                    "coverage_status": "Active & Verified",
                    "emergency_preauth": "Pre-authorized (Trauma & Triage)",
                    "primary_subscriber": clean_name,
                    "copay_emergency": "$0.00 (Covered)",
                },
            },
            registered_biometrics={},
        )
        db.add(patient)
        db.flush()
        patient_id = patient.id

        new_user = User(
            email=clean_email,
            hashed_password=hashed_pw,
            kind=UserKind.patient,
            patient_id=patient.id,
        )
        db.add(new_user)
        db.flush()

        tx = append_audit(
            db,
            "patient_registered",
            {"patient_id": patient.id, "health_id": health_id, "email": clean_email},
        )
    else:
        hospital = db.get(Hospital, body.hospital_id or 1) or db.query(Hospital).first()
        h_id = hospital.id if hospital else 1

        chosen_role = (body.role or "doctor").lower()
        try:
            staff_role = StaffRole(chosen_role)
        except ValueError:
            staff_role = StaffRole.doctor

        staff = Staff(hospital_id=h_id, name=body.name.strip(), role=staff_role)
        db.add(staff)
        db.flush()
        staff_id = staff.id
        role_str = staff_role.value

        new_user = User(
            email=clean_email,
            hashed_password=hashed_pw,
            kind=UserKind.staff,
            staff_id=staff.id,
        )
        db.add(new_user)
        db.flush()

        tx = append_audit(
            db,
            "staff_registered",
            {"staff_id": staff.id, "role": role_str, "hospital_id": h_id},
        )

    db.commit()

    token = create_access_token({"sub": str(new_user.id), "kind": user_kind.value, "role": role_str})
    return TokenOut(access_token=token, kind=user_kind.value, role=role_str, name=body.name.strip())


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    clean_username = form.username.strip().lower()
    user = db.query(User).filter(User.email == clean_username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email address or password.")
    role = None
    name = user.email
    if user.kind == UserKind.patient and user.patient_id:
        p = db.get(Patient, user.patient_id)
        name = p.name if p else name
        role = "patient"
    elif user.staff_id:
        s = db.get(Staff, user.staff_id)
        name = s.name if s else name
        role = s.role.value if s else None
    token = create_access_token({"sub": str(user.id), "kind": user.kind.value, "role": role})
    return TokenOut(access_token=token, kind=user.kind.value, role=role, name=name)
