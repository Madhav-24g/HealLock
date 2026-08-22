# HealLock

Patient-controlled healthcare data: **accessible in an emergency, private in normal care, accountable on-chain.**

This repo implements the merged HealLock + MEDGUARD architecture in `docs/HealLock_Final_Complete_Architecture.md`.

## What is running

| Layer | Implementation |
|---|---|
| Patient + hospital portals | React + TypeScript + Tailwind |
| API / RBAC / consent | FastAPI — every endpoint re-checks role + consent |
| Off-chain records | SQLite locally (Postgres-ready via `DATABASE_URL`), AES-256 field encryption |
| Blockchain audit | Append-only hash ledger (event metadata only — never raw records) |
| Emergency unlock | QR **or** face **or** fingerprint + mandatory reason code |
| Prescription safety | Rules engine (interactions / allergy / duplicates). Never auto-prescribes. |
| Document AI | Heuristic extraction; Claude API if `ANTHROPIC_API_KEY` is set |
| Anomaly detection | Rolling-average access + repeated emergency unlocks on the same patient |

HealLock is **not** a doctor replacement, not an autonomous diagnosis system, and not a chain that stores medical records.

## Quick start (local)

**Backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the Vite proxy forwards `/api` to port 8000.

## Demo accounts

Password for all: `heallock`

| Role | Email |
|---|---|
| Patient | asha@heallock.example |
| Emergency | jordan.hale@stmarys.example |
| Doctor | vikram.shah@stmarys.example |
| Pharmacist | priya.nair@stmarys.example |
| Receptionist | maya.chen@stmarys.example |
| Admin | alex.kim@stmarys.example |

Emergency QR token: `QR-ASHA-EMERGENCY`  
Health ID: `HL-ASHA-1001`

Try: sign in as ER → unlock with QR + reason `Unconscious` → sign in as Asha → see the push/SMS-style notification and a **Verified on-chain** timeline row. As doctor, check `ibuprofen` against her warfarin for a safety flag.

## Docker

```bash
docker compose up --build
```

API at `:8000`, web at `:5173` (nginx).

## Principles enforced in code

1. Patient control — grant/revoke consent  
2. Minimum necessary — receptionist sees identity only; pharmacist sees meds; ER sees emergency profile only  
3. Emergency availability — one verified factor is enough  
4. AI-assisted — flags and extraction; clinician decides  
5. Accountability — every access/consent writes a hash to the audit ledger  

Optional AR overlay for responders is **not** in this build (architecture §14).
