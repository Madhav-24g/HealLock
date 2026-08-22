from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Staff, StaffRole, User, UserKind

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    creds_exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise creds_exc
    except JWTError:
        raise creds_exc
    user = db.get(User, int(user_id))
    if not user:
        raise creds_exc
    return user


def require_patient(user: User = Depends(get_current_user)) -> User:
    if user.kind != UserKind.patient:
        raise HTTPException(status_code=403, detail="Patient access required")
    return user


def require_staff(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> tuple[User, Staff]:
    if user.kind != UserKind.staff or not user.staff_id:
        raise HTTPException(status_code=403, detail="Staff access required")
    staff = db.get(Staff, user.staff_id)
    if not staff:
        raise HTTPException(status_code=403, detail="Staff record missing")
    return user, staff


def require_roles(*roles: StaffRole):
    def checker(pair: tuple[User, Staff] = Depends(require_staff)) -> tuple[User, Staff]:
        _, staff = pair
        if staff.role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Role {staff.role.value} cannot access this resource",
            )
        return pair

    return checker
