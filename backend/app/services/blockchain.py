from app.crypto import event_hash, utcnow
from app.models import ChainBlock


def append_audit(db, event_type: str, metadata: dict) -> str:
    """Write hash + metadata only. Never raw medical content."""
    last = db.query(ChainBlock).order_by(ChainBlock.id.desc()).first()
    prev = last.event_hash if last else "0" * 64
    payload = {
        "prev_hash": prev,
        "event_type": event_type,
        "metadata": metadata,
        "ts": utcnow().isoformat(),
    }
    tx = event_hash(payload)
    block = ChainBlock(
        prev_hash=prev,
        event_type=event_type,
        metadata_json=metadata,
        event_hash=tx,
    )
    db.add(block)
    db.flush()
    return tx


def verify_tx(db, tx_hash: str | None) -> bool:
    if not tx_hash:
        return False
    return db.query(ChainBlock).filter(ChainBlock.event_hash == tx_hash).first() is not None
