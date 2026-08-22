from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.crypto import decrypt_text, encrypt_text
from app.database import get_db
from app.models import (
    AccessEvent,
    AccessType,
    MedicalRecord,
    Staff,
    StaffRole,
    User,
    UserKind,
)
from app.schemas import DocumentExtractIn, RecordIn
from app.security import get_current_user, require_roles
from app.services.ai import extract_fields_from_text, extract_with_claude, extract_with_gemini
from app.services.blockchain import append_audit
from app.services.consent import active_consent, can_read_category

router = APIRouter(prefix="/records", tags=["records"])


def _staff_pair(user: User, db: Session):
    if user.kind != UserKind.staff or not user.staff_id:
        raise HTTPException(status_code=403, detail="Staff only")
    staff = db.get(Staff, user.staff_id)
    if not staff:
        raise HTTPException(status_code=403, detail="Staff missing")
    return staff


@router.post("")
def create_record(
    body: RecordIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient_id = body.patient_id
    hospital_id = None
    if user.kind == UserKind.patient:
        patient_id = user.patient_id
    else:
        staff = _staff_pair(user, db)
        if staff.role not in (StaffRole.doctor, StaffRole.admin):
            raise HTTPException(status_code=403, detail="Only doctors may write records")
        hospital_id = staff.hospital_id
        grant = active_consent(db, patient_id, hospital_id)
        if not can_read_category(staff, grant, body.category):
            raise HTTPException(status_code=403, detail="Consent/role does not allow this category")
    rec = MedicalRecord(
        patient_id=patient_id,
        category=body.category,
        content_encrypted=encrypt_text(body.content),
        created_by_hospital_id=hospital_id,
        ai_extracted_fields={},
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"id": rec.id, "category": rec.category}


@router.get("/patient/{patient_id}")
def list_records(patient_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.kind == UserKind.patient:
        if user.patient_id != patient_id:
            raise HTTPException(status_code=403, detail="Cannot view another patient's records")
        rows = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient_id).all()
        return [_serialize(r, include_content=True) for r in rows]

    staff = _staff_pair(user, db)
    grant = active_consent(db, patient_id, staff.hospital_id)
    rows = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient_id).all()
    visible = []
    for r in rows:
        if can_read_category(staff, grant, r.category):
            visible.append(_serialize(r, include_content=True))
            db.add(
                AccessEvent(
                    patient_id=patient_id,
                    hospital_id=staff.hospital_id,
                    staff_id=staff.id,
                    access_type=AccessType.normal,
                    category=r.category,
                    tx_hash=append_audit(
                        db,
                        "normal_access",
                        {
                            "patient_id": patient_id,
                            "hospital_id": staff.hospital_id,
                            "staff_id": staff.id,
                            "category": r.category,
                        },
                    ),
                )
            )
    db.commit()
    return visible


@router.post("/extract")
async def extract(
    body: DocumentExtractIn,
    pair=Depends(require_roles(StaffRole.doctor)),
    db: Session = Depends(get_db),
):
    _, staff = pair
    grant = active_consent(db, body.patient_id, staff.hospital_id)
    if not can_read_category(staff, grant, body.category):
        raise HTTPException(status_code=403, detail="No consent for this category")
    fields = await extract_with_gemini(body.text)
    if not fields:
        fields = await extract_with_claude(body.text)
    if not fields:
        fields = extract_fields_from_text(body.text)
    rec = MedicalRecord(
        patient_id=body.patient_id,
        category=body.category,
        content_encrypted=encrypt_text(body.text),
        created_by_hospital_id=staff.hospital_id,
        ai_extracted_fields=fields,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return {"id": rec.id, "ai_extracted_fields": fields}


@router.get("/patient/{patient_id}/health-insights")
async def get_patient_health_insights(
    patient_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models import Patient, Prescription
    from app.services.ai import generate_health_and_diet_recommendations

    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if user.kind == UserKind.patient:
        if user.patient_id != patient_id:
            raise HTTPException(status_code=403, detail="Unauthorized to view another patient's health insights")
    else:
        staff = _staff_pair(user, db)
        grant = active_consent(db, patient_id, staff.hospital_id)
        if not grant or grant.status != "active":
            raise HTTPException(status_code=403, detail="Active patient consent is required to access clinical health insights")

    records = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient_id).all()
    rx_list = db.query(Prescription).filter(Prescription.patient_id == patient_id).all()

    records_summary = []
    for r in records:
        records_summary.append({
            "category": r.category,
            "created_at": r.created_at.isoformat(),
            "extracted_fields": r.ai_extracted_fields or {},
            "content_snippet": decrypt_text(r.content_encrypted)[:300] if r.content_encrypted else "",
        })

    prescriptions_summary = []
    for rx in rx_list:
        prescriptions_summary.append({
            "id": rx.id,
            "medications": rx.medications,
            "created_at": rx.created_at.isoformat(),
        })

    emerg = patient.emergency_profile or {}
    allergies = emerg.get("allergies", ["None Reported"])
    blood_group = emerg.get("blood_group", "O+")

    insights = await generate_health_and_diet_recommendations(
        patient_name=patient.name,
        allergies=allergies,
        blood_group=blood_group,
        records_summary=records_summary,
        prescriptions=prescriptions_summary,
    )
    return insights


def _serialize(r: MedicalRecord, include_content: bool):
    data = {
        "id": r.id,
        "category": r.category,
        "created_at": r.created_at.isoformat(),
        "ai_extracted_fields": r.ai_extracted_fields,
    }
    if include_content:
        data["content"] = decrypt_text(r.content_encrypted)
    return data
