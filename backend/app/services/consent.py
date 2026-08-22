from app.models import ConsentGrant, ConsentStatus, Staff, StaffRole
from app.crypto import utcnow


RECORD_CATEGORIES = {
    "identity",
    "emergency",
    "labs",
    "imaging",
    "notes",
    "medications",
    "prescriptions",
    "allergies",
    "conditions",
}


def role_allowed_categories(role: StaffRole) -> set[str]:
    if role == StaffRole.receptionist:
        return {"identity"}
    if role == StaffRole.pharmacist:
        return {"medications", "prescriptions", "allergies"}
    if role == StaffRole.emergency:
        return {"emergency"}
    if role == StaffRole.admin:
        return set()
    if role == StaffRole.doctor:
        return RECORD_CATEGORIES - {"emergency"}
    return set()


def active_consent(db, patient_id: int, hospital_id: int) -> ConsentGrant | None:
    now = utcnow()
    grant = (
        db.query(ConsentGrant)
        .filter(
            ConsentGrant.patient_id == patient_id,
            ConsentGrant.hospital_id == hospital_id,
            ConsentGrant.status == ConsentStatus.active,
            ConsentGrant.expires_at > now,
        )
        .order_by(ConsentGrant.id.desc())
        .first()
    )
    return grant


def can_read_category(staff: Staff, grant: ConsentGrant | None, category: str, emergency: bool = False) -> bool:
    allowed = role_allowed_categories(staff.role)
    if category not in allowed and not (emergency and category == "emergency" and staff.role == StaffRole.emergency):
        return False
    if emergency and category == "emergency" and staff.role == StaffRole.emergency:
        return True
    if staff.role == StaffRole.receptionist:
        return True
    if not grant:
        return False
    scope = set(grant.scope or [])
    if "all" in scope or category in scope:
        return True
    if category in ("medications", "prescriptions") and ("medications" in scope or "prescriptions" in scope):
        return True
    if category in ("notes", "clinical_notes") and ("notes" in scope or "clinical_notes" in scope):
        return True
    return False
