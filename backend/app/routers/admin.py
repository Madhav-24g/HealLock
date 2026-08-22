from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AccessAnomalyAlert, StaffRole
from app.security import require_roles
from app.services.ai import trend_from_values
from app.services.ml import detect_anomalies, expire_stale_consents
from app.models import HealthTrendSnapshot

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/jobs/expire-consents")
def expire(pair=Depends(require_roles(StaffRole.admin)), db: Session = Depends(get_db)):
    n = expire_stale_consents(db)
    return {"expired": n}


@router.post("/jobs/anomalies")
def run_anomalies(pair=Depends(require_roles(StaffRole.admin)), db: Session = Depends(get_db)):
    alerts = detect_anomalies(db)
    return {"created": len(alerts)}


@router.get("/alerts")
def alerts(pair=Depends(require_roles(StaffRole.admin)), db: Session = Depends(get_db)):
    detect_anomalies(db)
    rows = db.query(AccessAnomalyAlert).order_by(AccessAnomalyAlert.id.desc()).all()
    return [
        {
            "id": a.id,
            "hospital_id": a.hospital_id,
            "date": str(a.date),
            "access_count": a.access_count,
            "rolling_average": a.rolling_average,
            "severity": a.severity,
            "admin_reviewed": a.admin_reviewed,
            "note": a.note,
        }
        for a in rows
    ]


@router.post("/alerts/{alert_id}/review")
def review(alert_id: int, pair=Depends(require_roles(StaffRole.admin)), db: Session = Depends(get_db)):
    a = db.get(AccessAnomalyAlert, alert_id)
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found")
    a.admin_reviewed = True
    db.commit()
    return {"id": a.id, "admin_reviewed": True}


@router.get("/trends/{patient_id}")
def trends(patient_id: int, pair=Depends(require_roles(StaffRole.admin, StaffRole.doctor)), db: Session = Depends(get_db)):
    rows = db.query(HealthTrendSnapshot).filter(HealthTrendSnapshot.patient_id == patient_id).all()
    return [
        {
            "id": t.id,
            "metric_name": t.metric_name,
            "values": t.values,
            "trend_direction": t.trend_direction,
            "flagged_for_review": t.flagged_for_review,
        }
        for t in rows
    ]


@router.post("/trends/{patient_id}/recompute")
def recompute(patient_id: int, pair=Depends(require_roles(StaffRole.doctor, StaffRole.admin)), db: Session = Depends(get_db)):
    existing = db.query(HealthTrendSnapshot).filter(HealthTrendSnapshot.patient_id == patient_id).all()
    for t in existing:
        direction, flagged = trend_from_values([float(v) for v in t.values])
        t.trend_direction = direction
        t.flagged_for_review = flagged
    db.commit()
    return {"updated": len(existing)}
