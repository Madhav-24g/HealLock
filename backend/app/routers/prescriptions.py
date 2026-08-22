from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.crypto import decrypt_text
from app.database import get_db
from app.models import MedicalRecord, Patient, Prescription, StaffRole
from app.schemas import PrescriptionIn
from app.security import require_roles
from app.services.blockchain import append_audit
from app.services.consent import active_consent, can_read_category
from app.services.rx_safety import check_prescription

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


@router.get("/patient/{patient_id}")
def list_prescriptions(
    patient_id: int,
    pair=Depends(require_roles(StaffRole.doctor, StaffRole.pharmacist)),
    db: Session = Depends(get_db),
):
    _, staff = pair
    grant = active_consent(db, patient_id, staff.hospital_id)
    if not can_read_category(staff, grant, "medications") and not can_read_category(staff, grant, "prescriptions"):
        raise HTTPException(status_code=403, detail="No active consent for medication data")

    rows = db.query(Prescription).filter(Prescription.patient_id == patient_id).order_by(Prescription.id.desc()).all()
    return [
        {
            "id": r.id,
            "patient_id": r.patient_id,
            "hospital_id": r.hospital_id,
            "doctor_id": r.doctor_id,
            "medications": r.medications,
            "ai_flags": r.ai_flags,
            "dispensed": getattr(r, "dispensed", False),
            "created_at": str(r.created_at),
        }
        for r in rows
    ]


@router.post("/check")
def check(body: PrescriptionIn, pair=Depends(require_roles(StaffRole.doctor, StaffRole.pharmacist)), db: Session = Depends(get_db)):
    _, staff = pair
    grant = active_consent(db, body.patient_id, staff.hospital_id)
    if not can_read_category(staff, grant, "medications") and not can_read_category(staff, grant, "prescriptions"):
        raise HTTPException(status_code=403, detail="No consent for medication data")
    patient = db.get(Patient, body.patient_id)
    allergies = (patient.emergency_profile or {}).get("allergies", []) if patient else []
    existing = []
    recs = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.patient_id == body.patient_id, MedicalRecord.category.in_(["medications", "prescriptions"]))
        .all()
    )
    for r in recs:
        existing.extend(r.ai_extracted_fields.get("medications") or [])
        try:
            existing.append(decrypt_text(r.content_encrypted))
        except Exception:
            pass
    flags = check_prescription(body.medications, allergies, existing)
    return {
        "flags": flags,
        "decision": "Doctor / Pharmacist makes the final clinical decision. HealLock never auto-prescribes or blocks care.",
    }


@router.post("")
def create(body: PrescriptionIn, pair=Depends(require_roles(StaffRole.doctor)), db: Session = Depends(get_db)):
    _, staff = pair
    grant = active_consent(db, body.patient_id, staff.hospital_id)
    if not can_read_category(staff, grant, "prescriptions"):
        raise HTTPException(status_code=403, detail="No consent for prescriptions")
    patient = db.get(Patient, body.patient_id)
    allergies = (patient.emergency_profile or {}).get("allergies", []) if patient else []
    flags = check_prescription(body.medications, allergies, [])
    rx = Prescription(
        patient_id=body.patient_id,
        hospital_id=staff.hospital_id,
        doctor_id=staff.id,
        medications=body.medications,
        ai_flags=flags,
    )
    db.add(rx)
    db.commit()
    db.refresh(rx)

    tx = append_audit(
        db,
        "prescription_created",
        {"patient_id": body.patient_id, "hospital_id": staff.hospital_id, "rx_id": rx.id, "meds": body.medications},
    )
    return {"id": rx.id, "medications": rx.medications, "ai_flags": flags, "tx_hash": tx}


@router.post("/{rx_id}/dispense")
def dispense(rx_id: int, pair=Depends(require_roles(StaffRole.pharmacist)), db: Session = Depends(get_db)):
    _, staff = pair
    rx = db.get(Prescription, rx_id)
    if not rx:
        raise HTTPException(status_code=404, detail="Prescription not found")

    grant = active_consent(db, rx.patient_id, staff.hospital_id)
    if not can_read_category(staff, grant, "medications"):
        raise HTTPException(status_code=403, detail="No consent to dispense medications for this patient")

    tx = append_audit(
        db,
        "medication_dispensed",
        {"patient_id": rx.patient_id, "hospital_id": staff.hospital_id, "staff_id": staff.id, "rx_id": rx.id},
    )
    return {"id": rx.id, "dispensed": True, "tx_hash": tx, "status": "Dispensed & Logged on Ledger"}
