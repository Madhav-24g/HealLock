from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AccessEvent, Hospital, Staff, User, UserKind
from app.security import get_current_user
from app.services.blockchain import verify_tx

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("")
def timeline(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(AccessEvent)
    if user.kind == UserKind.patient:
        q = q.filter(AccessEvent.patient_id == user.patient_id)
    else:
        staff = db.get(Staff, user.staff_id)
        q = q.filter(AccessEvent.hospital_id == staff.hospital_id)
    rows = q.order_by(AccessEvent.timestamp.desc()).limit(100).all()
    out = []
    for e in rows:
        h = db.get(Hospital, e.hospital_id)
        s = db.get(Staff, e.staff_id)
        out.append(
            {
                "id": e.id,
                "patient_id": e.patient_id,
                "hospital": h.name if h else e.hospital_id,
                "staff": s.name if s else e.staff_id,
                "access_type": e.access_type.value,
                "factor_used": e.factor_used.value if e.factor_used else None,
                "reason": e.reason,
                "category": e.category,
                "timestamp": e.timestamp.isoformat(),
                "tx_hash": e.tx_hash,
                "on_chain_verified": verify_tx(db, e.tx_hash),
            }
        )
    return out
