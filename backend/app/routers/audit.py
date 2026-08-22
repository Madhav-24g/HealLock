from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChainBlock
from app.security import get_current_user

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/chain")
def chain(_: object = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(ChainBlock).order_by(ChainBlock.id.asc()).all()
    return [
        {
            "height": b.id,
            "event_type": b.event_type,
            "metadata": b.metadata_json,
            "prev_hash": b.prev_hash,
            "tx_hash": b.event_hash,
            "created_at": b.created_at.isoformat(),
        }
        for b in rows
    ]
