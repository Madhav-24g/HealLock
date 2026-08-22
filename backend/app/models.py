import enum
from datetime import date, datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.crypto import utcnow
from app.database import Base


class StaffRole(str, enum.Enum):
    receptionist = "receptionist"
    doctor = "doctor"
    pharmacist = "pharmacist"
    emergency = "emergency"
    admin = "admin"


class ConsentStatus(str, enum.Enum):
    active = "active"
    revoked = "revoked"
    expired = "expired"


class AccessType(str, enum.Enum):
    normal = "normal"
    emergency = "emergency"


class FactorUsed(str, enum.Enum):
    qr = "qr"
    face = "face"
    fingerprint = "fingerprint"


class UserKind(str, enum.Enum):
    patient = "patient"
    staff = "staff"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    kind: Mapped[UserKind] = mapped_column(Enum(UserKind))
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.id"), nullable=True)
    staff_id: Mapped[int | None] = mapped_column(ForeignKey("staff.id"), nullable=True)


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    dob: Mapped[date] = mapped_column(Date)
    health_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    emergency_profile: Mapped[dict] = mapped_column(JSON, default=dict)
    registered_biometrics: Mapped[dict] = mapped_column(JSON, default=dict)
    qr_token: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    records = relationship("MedicalRecord", back_populates="patient")
    consents = relationship("ConsentGrant", back_populates="patient")


class Hospital(Base):
    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    verification_status: Mapped[str] = mapped_column(String(32), default="verified")
    registered_departments: Mapped[list] = mapped_column(JSON, default=list)

    staff = relationship("Staff", back_populates="hospital")


class Staff(Base):
    __tablename__ = "staff"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id"))
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[StaffRole] = mapped_column(Enum(StaffRole))

    hospital = relationship("Hospital", back_populates="staff")


class ConsentGrant(Base):
    __tablename__ = "consent_grants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id"))
    scope: Mapped[list] = mapped_column(JSON, default=list)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[ConsentStatus] = mapped_column(Enum(ConsentStatus), default=ConsentStatus.active)
    tx_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    patient = relationship("Patient", back_populates="consents")
    hospital = relationship("Hospital")


class AccessEvent(Base):
    __tablename__ = "access_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id"))
    staff_id: Mapped[int] = mapped_column(ForeignKey("staff.id"))
    access_type: Mapped[AccessType] = mapped_column(Enum(AccessType))
    factor_used: Mapped[FactorUsed | None] = mapped_column(Enum(FactorUsed), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    tx_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    category: Mapped[str] = mapped_column(String(64))
    content_encrypted: Mapped[str] = mapped_column(Text)
    created_by_hospital_id: Mapped[int | None] = mapped_column(ForeignKey("hospitals.id"), nullable=True)
    ai_extracted_fields: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    patient = relationship("Patient", back_populates="records")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id"))
    doctor_id: Mapped[int] = mapped_column(ForeignKey("staff.id"))
    medications: Mapped[list] = mapped_column(JSON, default=list)
    ai_flags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class HealthTrendSnapshot(Base):
    __tablename__ = "health_trend_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"))
    metric_name: Mapped[str] = mapped_column(String(64))
    values: Mapped[list] = mapped_column(JSON, default=list)
    trend_direction: Mapped[str] = mapped_column(String(32))
    flagged_for_review: Mapped[bool] = mapped_column(Boolean, default=False)


class AccessAnomalyAlert(Base):
    __tablename__ = "access_anomaly_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id"))
    date: Mapped[date] = mapped_column(Date)
    access_count: Mapped[int] = mapped_column(Integer)
    rolling_average: Mapped[float] = mapped_column(Float)
    severity: Mapped[str] = mapped_column(String(32))
    admin_reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)


class ChainBlock(Base):
    """Append-only audit ledger. Stores event hash + metadata only — never raw medical data."""

    __tablename__ = "chain_blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    prev_hash: Mapped[str] = mapped_column(String(128))
    event_type: Mapped[str] = mapped_column(String(64))
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    event_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.id"), nullable=True)
    hospital_id: Mapped[int | None] = mapped_column(ForeignKey("hospitals.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(32), default="in_app")
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
