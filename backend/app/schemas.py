from datetime import date, datetime

from pydantic import BaseModel, Field


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    kind: str
    role: str | None = None
    name: str


class LoginIn(BaseModel):
    email: str
    password: str


class ConsentIn(BaseModel):
    hospital_id: int
    scope: list[str]
    expires_at: datetime


class RecordIn(BaseModel):
    category: str
    content: str
    patient_id: int | None = None


class DocumentExtractIn(BaseModel):
    patient_id: int
    category: str = "lab"
    text: str


class PrescriptionIn(BaseModel):
    patient_id: int
    medications: list[str]


class EmergencyUnlockIn(BaseModel):
    factor: str = Field(pattern="^(qr|face|fingerprint)$")
    qr_token: str | None = None
    health_id: str | None = None
    image_data: str | None = None  # Base64 camera snapshot
    biometric_match: bool = True
    reason: str = Field(pattern="^(Trauma|Cardiac|Unconscious|Other|Other Emergency)$")


class ReminderIn(BaseModel):
    patient_id: int
    instruction: str
