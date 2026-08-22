# HealLock — Final Complete System Architecture
### (Merged from HealLock + MEDGUARD specs — full build, nothing trimmed)

---

## 0. Domain Check

| Domain | Present? | Where |
|---|---|---|
| AI / ML | ✅ Yes | Record extraction, prescription safety explanations, health trend analysis, access anomaly detection, smart reminders |
| Blockchain | ✅ Yes | Consent/access/emergency audit ledger |
| Cybersecurity | ✅ Yes | RBAC, encryption, consent scoping, biometric auth, anomaly detection |
| Cloud / DevOps | ✅ Yes | Docker → K8s, CI/CD, monitoring |
| Hardware / IoT | ✅ Yes | QR / Face / Fingerprint emergency unlock |
| **XR / AR / VR** | ❌ No | Neither spec has a spatial/immersive use case — this is an identity, records, and access-control product. Forcing in AR/VR would dilute the pitch rather than strengthen it. (One optional idea noted in Section 14 if you want a visionary stretch feature.) |

Everything below is built around the five domains that are actually present.

---

## 1. Product Identity

**Name:** HealLock (canonical name used below; MEDGUARD spec is merged in as the same product — its emergency multi-factor design and cleaner data model are the stronger version and are used here)

**One-line pitch:**
> "In an emergency, doctors get what they need. In normal care, patients decide what they share. And every access is accountable — provably, on-chain."

**Five Core Principles** (this is your judging narrative):
1. Patient Control
2. Minimum Necessary Access
3. Emergency Availability
4. AI-Assisted Healthcare
5. Accountability

---

## 2. Complete Module List

1. Identity & Auth Service (patients, hospitals, staff — role-based)
2. Consent & Access Control Service
3. Medical Records Service (encrypted, off-chain)
4. Emergency Access Service — **multi-factor: QR / Face / Fingerprint, any ONE sufficient**
5. AI Health Intelligence Engine (document understanding + insights)
6. AI Prescription Safety Engine (rules engine + LLM explanation layer)
7. ML Health Trend Analysis
8. ML Access Anomaly Detection
9. Blockchain Audit Layer
10. Notification Service (real-time + push/SMS for emergencies)
11. Hospital & Staff Verification / Admin Service
12. Patient Access Timeline (the UI that ties AI + blockchain + consent together)
13. Cloud Infrastructure & DevOps Layer

---

## 3. Full System Architecture

```text
                                    HEALLOCK
                                       |
        +-------------------------------+-------------------------------+
        |                                                               |
        v                                                               v
  PATIENT APPLICATION                                          HOSPITAL / STAFF PORTAL
  (React + TS, Web + Mobile-responsive)                        (React + TS — receptionist,
        |                                                       doctor, pharmacist, emergency,
        |                                                       admin views by role)
        |                                                               |
        +-------------------------------+-------------------------------+
                                        |
                                        v
                              API GATEWAY
              Auth (OAuth2/JWT) + Role-Based Access Control
                     Rate limiting + Input validation
                                        |
        +---------------+---------------+---------------+---------------+
        |               |               |               |               |
        v               v               v               v               v
  IDENTITY &       CONSENT &        MEDICAL           EMERGENCY        ADMIN /
  AUTH SERVICE     ACCESS           RECORDS           ACCESS           VERIFICATION
        |          SERVICE          SERVICE           SERVICE          SERVICE
        |               |               |               |               |
        |               |               v               |               |
        |               |         ENCRYPTED STORAGE      |               |
        |               |         PostgreSQL             |               |
        |               |         AES-256 field-level     |               |
        |               |         encryption + files     |               |
        |               |               |               |               |
        |               |               |          MULTI-FACTOR         |
        |               |               |          UNLOCK (any ONE):     |
        |               |               |          • QR Scan            |
        |               |               |          • Face (liveness)    |
        |               |               |          • Fingerprint        |
        |               |               |          (WebAuthn / device)  |
        +---------------+---------------+---------------+---------------+
                                        |
                                        v
                          AI / ML INTELLIGENCE LAYER
        +---------------+---------------+---------------+---------------+
        |               |               |               |               |
        v               v               v               v               v
  DOCUMENT AI      PRESCRIPTION      HEALTH TREND    ANOMALY          SMART
  (OCR + LLM       SAFETY ENGINE     ANALYSIS (ML)   DETECTION (ML)   REMINDERS
  extraction)      (RxNorm/DDInter                                   (rule + LLM
        |          rules + LLM                                       explanation)
        |          explanation)
        v               v               v               v               v
  Structured      Doctor Alert      Trend Alert     Security Alert   Patient Alert
  Patient Record  (never auto-      (review          (admin review)   (medication /
                  prescribes)       recommended)                      follow-up)
                                        |
                                        v
                          SECURITY / TRUST LAYER
        +-------------------------------+-------------------------------+
        |                                                               |
        v                                                               v
  ML ANOMALY DETECTION                                          BLOCKCHAIN AUDIT LAYER
  (rolling-avg access pattern                                   (consent granted/revoked/
   per hospital, threshold alert)                                expired, normal access,
        |                                                        emergency access — event
        |                                                        hash + metadata only,
        |                                                        NEVER raw medical data)
        +-------------------------------+-------------------------------+
                                        |
                                        v
                          PATIENT ACCESS TIMELINE
              (Postgres for speed, ✓ Blockchain Verified badge
               per entry, links to on-chain tx)
                                        |
                                        v
                          NOTIFICATION SERVICE
              (in-app real-time via WebSocket, push, SMS for
               emergency events)


                          INFRASTRUCTURE / DEVOPS LAYER
        +-------------------------------+-------------------------------+
        |                                                               |
        v                                                               v
      CLOUD                                                          DEVOPS
  Managed Postgres, object storage,                          Git → CI/CD pipeline
  container hosting, autoscaling                              Docker → Kubernetes
                                                                Automated tests
                                                                Monitoring / alerting
                                                                (logs, uptime, error
                                                                 tracking)
```

---

## 4. Emergency Access Flow (merged — multi-factor, single-factor-sufficient)

```text
Patient unconscious / incapacitated
          |
          v
Hospital initiates Emergency Access
          |
          v
Verify identity via ANY ONE of:
   • QR Scan (emergency card / app / wearable)
   • Face Scan (liveness match vs registered template)
   • Fingerprint (WebAuthn / hospital scanner SDK)
          |
          v
Mandatory reason code (Trauma | Cardiac | Unconscious | Other)
          |
          v
🚨 Emergency Profile unlocked (ONLY):
   Blood Group, Allergies, Critical Meds,
   Critical Conditions, Emergency Contacts
   — never the full medical history
          |
          v
Access Event created
   (hospital_id, staff_id, factor_used, reason, timestamp)
          |
    +-----+-----+
    |           |
    v           v
PostgreSQL   Blockchain
(fast copy)  (immutable proof, tx_hash returned)
          |
          v
Patient / guardian notified instantly (push + SMS)
```

**Design rationale (keep this in your pitch):** emergencies can't tolerate multi-step friction, so a single verified factor unlocks the profile immediately. Safety is preserved not by adding friction but by making misuse *traceable* — mandatory reason code, immutable on-chain logging, and instant patient notification mean nothing can happen silently.

---

## 5. Complete Data Model

```text
Patient
  id, name, DOB, health_id (unique)
  emergency_profile {
    blood_group, allergies[], critical_meds[],
    critical_conditions[], emergency_contacts[]
  }
  registered_biometrics { face_template_ref, fingerprint_template_ref }

Hospital
  id, name, verification_status, registered_departments[]

Staff
  id, hospital_id, role (receptionist|doctor|pharmacist|emergency|admin),
  auth_credentials

ConsentGrant
  id, patient_id, hospital_id, scope[] (record categories),
  expires_at, status (active|revoked|expired)

AccessEvent  — mirrored on-chain (hash/metadata) + off-chain (fast queries)
  id, patient_id, hospital_id, staff_id,
  access_type (normal|emergency),
  factor_used (qr|face|fingerprint)  ← only for emergency_access
  reason, timestamp, tx_hash

MedicalRecord (encrypted, off-chain ONLY — never touches the chain)
  id, patient_id, category, content_encrypted, created_by_hospital_id,
  ai_extracted_fields (structured JSON from Document AI)

Prescription
  id, patient_id, hospital_id, doctor_id, medications[],
  ai_flags[] (conflict_type, severity, explanation)

HealthTrendSnapshot (ML layer)
  id, patient_id, metric_name, values[] (time series), trend_direction,
  flagged_for_review (bool)

AccessAnomalyAlert (ML layer)
  id, hospital_id, date, access_count, rolling_average,
  severity, admin_reviewed (bool)
```

---

## 6. Where Blockchain Fits — Exact Boundary

**Blockchain = tamper-evident audit ledger only. Never a data store.**

On-chain (immutable, append-only):
- Consent Granted / Revoked / Expired
- Normal Access (hospital reads an authorized record)
- Emergency Access (hospital unlocks emergency profile)

Off-chain (Postgres, encrypted, editable/deletable on patient request):
- Actual medical records, prescriptions, patient/hospital profiles, biometric template references

```text
Patient approves consent
        |
        v
Postgres: ConsentGrant row updated (fast, queryable)
        |
        v
Blockchain: event hash written (slow, immutable, provable)
        |
        v
tx_hash stored back on the ConsentGrant/AccessEvent row, linking the two
```

The "who accessed my records" timeline reads from Postgres for speed, with a ✅ Verified on-chain badge per entry, checked against `tx_hash`.

---

## 7. AI Prescription Safety Flow

```text
Doctor enters prescription
        |
        v
Pull patient's AUTHORIZED medication + allergy data
        |
        v
Rules engine checks (RxNorm / DDInter interaction data):
   • Drug interaction
   • Allergy conflict
   • Duplicate medication
   • Contraindication
        |
        v
Claude API generates a plain-language explanation of any flag
        |
        v
⚠️ Alert shown to doctor
        |
        v
Doctor makes the final clinical decision
   (system NEVER auto-prescribes, cancels, or blocks)
```

---

## 8. AI Health Intelligence — Full Detail

**Document AI (record understanding):**
```text
Uploaded document (PDF / image: prescription, lab report, discharge summary)
        |
        v
OCR / vision extraction (Claude API vision)
        |
        v
Structured field extraction (medications, values, diagnoses, dates)
        |
        v
Written to MedicalRecord.ai_extracted_fields
        |
        v
Available to downstream AI (prescription safety, insights, trends)
```

**Health Insights:** surfaced from authorized records as decision-support signals only — never framed as a diagnosis. Examples: relevant historical patterns, missing information that may need review, risk signals, follow-up-related information.

**Smart Reminders:** generated from recorded doctor instructions and care plans (medication timing, follow-up dates, test schedules) — AI assists in phrasing/explaining reminders, never invents a treatment plan.

---

## 9. ML Layer — Full Detail

**A. Health Trend Analysis**
Pulls historical values for a metric, computes trend (regression/slope), flags meaningful changes for doctor review. Never claims a diagnosis from a trend alone.

**B. Access Anomaly Detection**
```text
Access Events
     |
     v
Feature extraction (per-hospital daily access count,
access-pattern deviation)
     |
     v
Anomaly scoring (rolling average + threshold, upgradeable
to a trained model later without touching other services)
     |
     v
Normal / Suspicious
     |
     +----------+
     |          |
   Normal    Suspicious
     |          |
     v          v
 Continue   Security Alert → Admin Review
```
Also flags a specific abuse pattern from the MEDGUARD spec: a hospital repeatedly triggering emergency access for the *same* patient — a strong signal worth calling out to judges as a concrete misuse case your system catches.

---

## 10. Role-Based Access Control

| Role | Sees |
|---|---|
| Receptionist | Basic patient identity only |
| Doctor | Authorized medical records (per consent scope) |
| Pharmacist | Medication / prescription data only |
| Emergency staff | Emergency profile only (via multi-factor unlock) |
| Hospital Admin | Staff management, verification, security alerts |
| Patient | Full own profile, consent controls, access timeline |

Enforced at the **API layer**, not just the UI — every request re-validates role + consent scope + requested data before returning anything.

---

## 11. Full Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + TailwindCSS |
| Backend | Node.js (NestJS) or Python (FastAPI) — REST + WebSocket |
| Off-chain DB | PostgreSQL, field-level AES-256 encryption |
| File Storage | Encrypted object storage (e.g. S3-compatible) |
| Blockchain | Hyperledger Fabric (permissioned, hospitals-only) *or* a private/testnet EVM chain for a publicly-verifiable demo |
| Face verification | face-api.js (prototype) → AWS Rekognition Liveness (production) |
| Fingerprint | WebAuthn / device biometric API (prototype) → hospital scanner SDK (production) |
| AI — Document & Insights | Claude API (vision + text) |
| AI — Prescription Safety | RxNorm / DDInter rules engine + Claude API for explanations |
| ML — Trend & Anomaly | Statistical baseline now, upgradeable to trained models (isolation forest / time-series model) later without re-architecting |
| Auth | OAuth2 + JWT, role claims |
| Notifications | WebSocket (in-app) + Push + SMS |
| Infra (dev) | Docker Compose |
| Infra (scale) | Kubernetes |
| CI/CD | GitHub Actions or equivalent |
| Monitoring | Application + infrastructure monitoring, error tracking, uptime alerting |

---

## 12. Security Requirements

- Zero raw medical data on-chain — chain stores only event hashes/metadata
- All off-chain medical data encrypted at rest (AES-256) and in transit (TLS 1.3)
- Role-based field-level access control enforced at the API layer
- Emergency access needs only ONE verified factor + mandatory reason code, but every unlock is logged immutably (append-only, never deletable)
- Automatic expiry cron job revokes stale consent grants
- Rate-limiting + anomaly detection (e.g. hospital repeatedly triggering emergency access for the same patient)
- Backend-enforced authorization on every endpoint — frontend role checks are UX only, never the security boundary

---

## 13. What HealLock Is NOT (keep this in the pitch — it pre-empts judge pushback)

- Not a replacement for doctors
- Not an autonomous diagnosis or prescription system
- Not a blockchain medical-record storage system
- Not a system that gives hospitals unrestricted access
- Not a generic AI chatbot

> **HealLock is a secure, patient-controlled healthcare data and decision-support platform — accessible when it matters, private when it should be, accountable every time.**

---

## 14. Optional Stretch Idea (only if XR is wanted — not core to the architecture)

Since you asked specifically about XR/AR/VR: the one place it could plausibly attach without feeling forced is an **AR overlay for emergency responders** — pointing a phone camera at the patient's QR/emergency card surfaces the emergency profile as an AR heads-up overlay (blood group, allergies, critical meds) instead of a flat screen. It's a genuinely optional differentiator, not a dependency of the core architecture, and would only be worth it if your team has spare hours after Sections 3–11 are solid — a working core beats an unfinished AR layer every time in judging.
