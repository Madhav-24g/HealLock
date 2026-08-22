import hashlib
import json
from base64 import urlsafe_b64encode
from datetime import datetime, timezone

from cryptography.fernet import Fernet

from app.config import settings


def _fernet() -> Fernet:
    raw = settings.encryption_key.encode("utf-8")
    digest = hashlib.sha256(raw).digest()
    return Fernet(urlsafe_b64encode(digest))


def encrypt_text(plain: str) -> str:
    return _fernet().encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt_text(token: str) -> str:
    return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")


def event_hash(payload: dict) -> str:
    canonical = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
