from datetime import date, datetime, timedelta, timezone

from app.crypto import encrypt_text
from app.database import Base, SessionLocal, engine
from app.models import (
    ConsentGrant,
    ConsentStatus,
    HealthTrendSnapshot,
    Hospital,
    MedicalRecord,
    Patient,
    Staff,
    StaffRole,
    User,
    UserKind,
)
from app.security import hash_password
from app.services.blockchain import append_audit
from app.services.ai import trend_from_values

Base.metadata.create_all(bind=engine)
db = SessionLocal()

if db.query(User).first():
    print("Already seeded")
    db.close()
    raise SystemExit(0)

hospital = Hospital(
    name="St. Mary's General",
    verification_status="verified",
    registered_departments=["ER", "Cardiology", "Pharmacy", "Admin"],
)
db.add(hospital)
db.flush()

patient = Patient(
    name="Asha Rao",
    dob=date(1994, 3, 12),
    health_id="HL-ASHA-1001",
    qr_token="QR-ASHA-EMERGENCY",
    emergency_profile={
        "blood_group": "O+",
        "allergies": ["penicillin"],
        "critical_meds": ["warfarin"],
        "critical_conditions": ["atrial fibrillation"],
        "emergency_contacts": [{"name": "Rohan Rao", "phone": "+91-90000-11111"}],
    },
    registered_biometrics={
        "face_template_ref": "face-asha-ref",
        "fingerprint_template_ref": "fp-asha-ref",
    },
)
db.add(patient)
db.flush()

roles = [
    ("Maya Chen", StaffRole.receptionist, "maya.chen@stmarys.example"),
    ("Dr. Vikram Shah", StaffRole.doctor, "vikram.shah@stmarys.example"),
    ("Priya Nair", StaffRole.pharmacist, "priya.nair@stmarys.example"),
    ("Jordan Hale", StaffRole.emergency, "jordan.hale@stmarys.example"),
    ("Alex Kim", StaffRole.admin, "alex.kim@stmarys.example"),
]
staff_ids = {}
for name, role, email in roles:
    s = Staff(hospital_id=hospital.id, name=name, role=role)
    db.add(s)
    db.flush()
    staff_ids[role] = s.id
    db.add(User(email=email, hashed_password=hash_password("heallock"), kind=UserKind.staff, staff_id=s.id))

db.add(User(email="asha@heallock.example", hashed_password=hash_password("heallock"), kind=UserKind.patient, patient_id=patient.id))

expires = datetime.now(timezone.utc) + timedelta(days=30)
consent = ConsentGrant(
    patient_id=patient.id,
    hospital_id=hospital.id,
    scope=["labs", "medications", "prescriptions", "notes", "allergies", "conditions"],
    expires_at=expires,
    status=ConsentStatus.active,
)
db.add(consent)
db.flush()
consent.tx_hash = append_audit(
    db,
    "consent_granted",
    {"consent_id": consent.id, "patient_id": patient.id, "hospital_id": hospital.id, "scope": consent.scope},
)

db.add(
    MedicalRecord(
        patient_id=patient.id,
        category="labs",
        content_encrypted=encrypt_text("HbA1c: 6.8 %\nCreatinine: 1.1 mg/dL\nINR: 2.4"),
        created_by_hospital_id=hospital.id,
        ai_extracted_fields={
            "lab_values": [
                {"name": "HbA1c", "value": "6.8", "unit": "%"},
                {"name": "Creatinine", "value": "1.1", "unit": "mg/dL"},
                {"name": "INR", "value": "2.4", "unit": ""},
            ]
        },
    )
)
db.add(
    MedicalRecord(
        patient_id=patient.id,
        category="medications",
        content_encrypted=encrypt_text("warfarin 5mg daily"),
        created_by_hospital_id=hospital.id,
        ai_extracted_fields={"medications": ["warfarin"]},
    )
)

hba1c = [6.2, 6.4, 6.5, 6.8, 7.1]
direction, flagged = trend_from_values(hba1c)
db.add(
    HealthTrendSnapshot(
        patient_id=patient.id,
        metric_name="HbA1c",
        values=hba1c,
        trend_direction=direction,
        flagged_for_review=flagged,
    )
)

db.commit()
print("Seeded demo users (password for all: heallock)")
print("  Patient: asha@heallock.example")
print("  ER:      jordan.hale@stmarys.example")
print("  Doctor:  vikram.shah@stmarys.example")
print("  Admin:   alex.kim@stmarys.example")
print("  QR token: QR-ASHA-EMERGENCY")
db.close()
