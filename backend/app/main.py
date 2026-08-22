from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import admin, audit, auth, emergency, hospital, patient, prescriptions, records, timeline

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="HealLock API",
    description="Patient-controlled healthcare data: accessible in emergencies, private otherwise, accountable on-chain.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patient.router)
app.include_router(hospital.router)
app.include_router(records.router)
app.include_router(emergency.router)
app.include_router(prescriptions.router)
app.include_router(timeline.router)
app.include_router(admin.router)
app.include_router(audit.router)


@app.get("/health")
def health():
    return {"status": "ok", "product": "HealLock"}
