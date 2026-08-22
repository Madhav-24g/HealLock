from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.crypto import utcnow
from app.models import AccessAnomalyAlert, AccessEvent, AccessType, ConsentGrant, ConsentStatus


def expire_stale_consents(db: Session) -> int:
    now = utcnow()
    rows = (
        db.query(ConsentGrant)
        .filter(ConsentGrant.status == ConsentStatus.active, ConsentGrant.expires_at < now)
        .all()
    )
    for row in rows:
        row.status = ConsentStatus.expired
    db.commit()
    return len(rows)


def detect_anomalies(db: Session) -> list[AccessAnomalyAlert]:
    today = utcnow().date()
    hospitals = db.query(AccessEvent.hospital_id).distinct().all()
    created: list[AccessAnomalyAlert] = []
    for (hid,) in hospitals:
        count = (
            db.query(func.count(AccessEvent.id))
            .filter(AccessEvent.hospital_id == hid, func.date(AccessEvent.timestamp) == today)
            .scalar()
            or 0
        )
        avg = (
            db.query(func.count(AccessEvent.id))
            .filter(
                AccessEvent.hospital_id == hid,
                AccessEvent.timestamp >= utcnow() - timedelta(days=7),
            )
            .scalar()
            or 0
        ) / 7.0
        severity = None
        if avg > 0 and count > avg * 2.5 and count >= 8:
            severity = "high"
        elif avg > 0 and count > avg * 1.8 and count >= 5:
            severity = "medium"

        repeat_emergency = (
            db.query(AccessEvent.patient_id, func.count(AccessEvent.id))
            .filter(
                AccessEvent.hospital_id == hid,
                AccessEvent.access_type == AccessType.emergency,
                AccessEvent.timestamp >= utcnow() - timedelta(days=7),
            )
            .group_by(AccessEvent.patient_id)
            .having(func.count(AccessEvent.id) >= 3)
            .all()
        )
        note = None
        if repeat_emergency:
            severity = severity or "high"
            pids = ", ".join(str(p) for p, _ in repeat_emergency)
            note = f"Repeated emergency access for patient(s) {pids} in 7 days"

        if not severity:
            continue
        existing = (
            db.query(AccessAnomalyAlert)
            .filter(AccessAnomalyAlert.hospital_id == hid, AccessAnomalyAlert.date == today)
            .first()
        )
        if existing:
            existing.access_count = count
            existing.rolling_average = round(avg, 2)
            existing.severity = severity
            existing.note = note
            created.append(existing)
        else:
            alert = AccessAnomalyAlert(
                hospital_id=hid,
                date=today,
                access_count=count,
                rolling_average=round(avg, 2),
                severity=severity,
                note=note,
            )
            db.add(alert)
            created.append(alert)
    db.commit()
    return created
