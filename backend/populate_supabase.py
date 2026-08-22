from datetime import date, timedelta
from app.database import SessionLocal
from app.models import (
    Patient,
    User,
    UserKind,
    MedicalRecord,
    ConsentGrant,
    ConsentStatus,
    Hospital,
    Staff,
    StaffRole,
    Prescription,
)
from app.crypto import encrypt_text, utcnow
from app.security import hash_password
from app.services.blockchain import append_audit


def populate():
    db = SessionLocal()

    # 1. Hospital
    h = db.get(Hospital, 1)
    if not h:
        h = Hospital(
            name="St. Mary's General Hospital",
            registered_departments=["Cardiology", "Emergency", "Pharmacy", "Radiology", "General Medicine"],
        )
        db.add(h)
        db.flush()

    # 2. Staff: Doctor Vikram Shah & Pharmacist Priya Nair
    u_doc = db.query(User).filter(User.email == "vikram.shah@stmarys.example").first()
    s_doc = None
    if not u_doc:
        s_doc = Staff(hospital_id=h.id, name="Dr. Vikram Shah", role=StaffRole.doctor)
        db.add(s_doc)
        db.flush()
        u_doc = User(
            email="vikram.shah@stmarys.example",
            password_hash=hash_password("heallock"),
            kind=UserKind.staff,
            staff_id=s_doc.id,
        )
        db.add(u_doc)
    else:
        s_doc = db.get(Staff, u_doc.staff_id)

    u_ph = db.query(User).filter(User.email == "priya.nair@stmarys.example").first()
    if not u_ph:
        s_ph = Staff(hospital_id=h.id, name="Priya Nair", role=StaffRole.pharmacist)
        db.add(s_ph)
        db.flush()
        u_ph = User(
            email="priya.nair@stmarys.example",
            password_hash=hash_password("heallock"),
            kind=UserKind.staff,
            staff_id=s_ph.id,
        )
        db.add(u_ph)

    # 3. Patient 1: Asha Rao (HL-ASHA-1001)
    p1 = db.query(Patient).filter(Patient.health_id == "HL-ASHA-1001").first()
    p1_profile = {
        "blood_group": "O+",
        "allergies": ["Penicillin", "Sulfa drugs"],
        "critical_meds": ["Warfarin 5mg daily", "Metformin 500mg"],
        "critical_conditions": ["Atrial Fibrillation", "Type 2 Diabetes"],
        "insurance": {
            "provider": "Blue Cross Blue Shield Platinum",
            "policy_number": "BCBS-9048210-A",
            "group_id": "GRP-77402",
            "coverage_status": "Active and Verified",
            "emergency_preauth": "Pre-authorized (Emergency Triage and Trauma)",
            "primary_subscriber": "Asha Rao",
            "copay_emergency": "$50.00",
        },
        "emergency_contacts": [
            {"name": "Rohan Rao (Spouse)", "relation": "Spouse / Next of Kin", "phone": "+91-98840-12345"},
            {"name": "Dr. H. K. Rao (Father)", "relation": "Primary Care Contact", "phone": "+91-98400-54321"},
        ],
        "organ_donor": "Registered Donor (Heart, Kidneys, Liver)",
        "advance_directives": "Full Resuscitation Approved • DNR: No",
    }

    if not p1:
        p1 = Patient(
            name="Asha Rao",
            dob=date(1988, 4, 12),
            health_id="HL-ASHA-1001",
            qr_token="QR-ASHA-EMERGENCY",
            emergency_profile=p1_profile,
        )
        db.add(p1)
        db.flush()
        u1 = User(
            email="asha@heallock.example",
            password_hash=hash_password("heallock"),
            kind=UserKind.patient,
            patient_id=p1.id,
        )
        db.add(u1)
    else:
        p1.name = "Asha Rao"
        p1.emergency_profile = p1_profile

    # 4. Patient 2: Gourish Madhav (HL-GOURISH-1001)
    p2 = db.query(Patient).filter(Patient.health_id == "HL-GOURISH-1001").first()
    p2_profile = {
        "blood_group": "B+",
        "allergies": ["Aspirin", "Ibuprofen (NSAIDs)"],
        "critical_meds": ["Atorvastatin 20mg", "Lisinopril 10mg"],
        "critical_conditions": ["Hypertension", "Dyslipidemia"],
        "insurance": {
            "provider": "Star Health Premier Comprehensive",
            "policy_number": "STAR-8819204-G",
            "group_id": "GRP-SH-992",
            "coverage_status": "Active and Verified (Sum Insured: Rs. 25,00,000)",
            "emergency_preauth": "Pre-authorized (Zero Cashless Network)",
            "primary_subscriber": "Gourish Madhav",
            "copay_emergency": "Rs. 0 (100 percent Cashless Covered)",
        },
        "emergency_contacts": [
            {"name": "S. Madhav (Father)", "relation": "Next of Kin", "phone": "+91-97100-88899"},
            {"name": "Pooja Madhav (Sister)", "relation": "Family Emergency", "phone": "+91-94440-77766"},
        ],
        "organ_donor": "Registered Donor (All Organs)",
        "advance_directives": "Full Resuscitation Approved • DNR: No",
    }

    if not p2:
        p2 = Patient(
            name="Gourish Madhav",
            dob=date(1995, 8, 22),
            health_id="HL-GOURISH-1001",
            qr_token="QR-GOURISH-EMERGENCY",
            emergency_profile=p2_profile,
        )
        db.add(p2)
        db.flush()
        u2 = User(
            email="gourish@heallock.example",
            password_hash=hash_password("heallock"),
            kind=UserKind.patient,
            patient_id=p2.id,
        )
        db.add(u2)
    else:
        p2.name = "Gourish Madhav"
        p2.emergency_profile = p2_profile

    db.flush()

    # 5. Active Consents for both patients
    for pat in [p1, p2]:
        c = db.query(ConsentGrant).filter(ConsentGrant.patient_id == pat.id, ConsentGrant.hospital_id == h.id).first()
        tx = append_audit(
            db,
            "consent_granted",
            {"patient_id": pat.id, "hospital_id": h.id, "scope": ["labs", "medications", "clinical_notes", "scans"]},
        )
        if not c:
            c = ConsentGrant(
                patient_id=pat.id,
                hospital_id=h.id,
                scope=["labs", "medications", "clinical_notes", "scans"],
                expires_at=utcnow() + timedelta(days=90),
                status=ConsentStatus.active,
                tx_hash=tx,
            )
            db.add(c)
        else:
            c.status = ConsentStatus.active
            c.scope = ["labs", "medications", "clinical_notes", "scans"]
            c.expires_at = utcnow() + timedelta(days=90)
            c.tx_hash = tx

    # 6. Upload real clinical records with AES encryption
    # Clear existing and add fresh realistic ones
    db.query(MedicalRecord).filter(MedicalRecord.patient_id.in_([p1.id, p2.id])).delete(synchronize_session=False)

    # Asha's records
    db.add(
        MedicalRecord(
            patient_id=p1.id,
            category="labs",
            created_by_hospital_id=h.id,
            content_encrypted=encrypt_text(
                "Comprehensive Coagulation Panel:\n"
                "Prothrombin Time (PT): 24.2 sec (High)\n"
                "INR: 2.6 (Target Therapeutic Range: 2.0 - 3.0 for Atrial Fibrillation)\n"
                "HbA1c: 6.4% (Well-Controlled Type 2 Diabetes)\n"
                "Platelet Count: 240,000 /uL\n"
                "Clinical Interpretation: Anticoagulation is in therapeutic window. Continue Warfarin 5mg daily."
            ),
            ai_extracted_fields={"inr": "2.6", "medications": ["Warfarin 5mg"], "hba1c": "6.4%", "pt": "24.2 sec"},
        )
    )
    db.add(
        MedicalRecord(
            patient_id=p1.id,
            category="clinical_notes",
            created_by_hospital_id=h.id,
            content_encrypted=encrypt_text(
                "Cardiology Consultation Note (Dr. Vikram Shah):\n"
                "Chief Complaint: Routine 3-month AFib evaluation.\n"
                "Assessment: Patient is asymptomatic with good rate control on beta-blocker.\n"
                "Plan: Maintain current anticoagulation and lifestyle management."
            ),
            ai_extracted_fields={"diagnosis": "Atrial Fibrillation", "status": "Stable", "physician": "Dr. Vikram Shah"},
        )
    )

    # Gourish's records
    db.add(
        MedicalRecord(
            patient_id=p2.id,
            category="medications",
            created_by_hospital_id=h.id,
            content_encrypted=encrypt_text(
                "Cardiovascular and Lipid Management Prescription (Dr. Vikram Shah):\n"
                "1. Atorvastatin 20mg orally once daily at bedtime.\n"
                "2. Lisinopril 10mg orally once daily in the morning.\n"
                "Blood Pressure: 128/82 mmHg | Heart Rate: 72 bpm.\n"
                "CRITICAL ALLERGY ALERT: Confirmed severe allergy to NSAIDs (Aspirin and Ibuprofen). Strictly use Acetaminophen for pain management."
            ),
            ai_extracted_fields={
                "bp": "128/82 mmHg",
                "medications": ["Atorvastatin 20mg", "Lisinopril 10mg"],
                "allergies": ["Aspirin", "Ibuprofen"],
            },
        )
    )
    db.add(
        MedicalRecord(
            patient_id=p2.id,
            category="labs",
            created_by_hospital_id=h.id,
            content_encrypted=encrypt_text(
                "Lipid Profile and Renal Function Panel:\n"
                "Total Cholesterol: 185 mg/dL (Desirable)\n"
                "LDL Cholesterol: 92 mg/dL (Controlled on Statin)\n"
                "HDL Cholesterol: 52 mg/dL\n"
                "Triglycerides: 140 mg/dL\n"
                "Serum Creatinine: 0.9 mg/dL | eGFR: >90 mL/min"
            ),
            ai_extracted_fields={"ldl": "92 mg/dL", "cholesterol": "185 mg/dL", "creatinine": "0.9 mg/dL"},
        )
    )

    # 7. Add Active Prescriptions for both patients
    db.query(Prescription).filter(Prescription.patient_id.in_([p1.id, p2.id])).delete(synchronize_session=False)

    db.add(
        Prescription(
            patient_id=p1.id,
            hospital_id=h.id,
            doctor_id=s_doc.id if s_doc else 1,
            medications=["Warfarin 5mg (once daily evening)", "Metformin 500mg (twice daily with meals)"],
            ai_flags=[],
        )
    )

    db.add(
        Prescription(
            patient_id=p2.id,
            hospital_id=h.id,
            doctor_id=s_doc.id if s_doc else 1,
            medications=["Atorvastatin 20mg (once daily at bedtime)", "Lisinopril 10mg (once daily morning)"],
            ai_flags=[],
        )
    )

    db.commit()
    print("[SUCCESS] Real records, consents, and prescriptions populated in Supabase PostgreSQL!")


if __name__ == "__main__":
    populate()
