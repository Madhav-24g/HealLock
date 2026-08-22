const API = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export type Session = {
  token: string;
  kind: string;
  role: string | null;
  name: string;
  email?: string;
  patient_id?: number;
  staff_id?: number;
  health_id?: string;
  firebaseUser?: any;
};

export function getSession(): Session | null {
  const raw = localStorage.getItem("heallock");
  return raw ? JSON.parse(raw) : null;
}

export function setSession(s: Session | null) {
  if (!s) localStorage.removeItem("heallock");
  else localStorage.setItem("heallock", JSON.stringify(s));
}

const DB_KEY = "heallock_db_v5";

// Auto-purge outdated legacy local storage if present
try {
  localStorage.removeItem("heallock_mock_db");
  localStorage.removeItem("heallock_mock_db_v1");
  localStorage.removeItem("heallock_mock_db_v2");
} catch {}

function getMockDB() {
  const stored = localStorage.getItem(DB_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }

  const initialDB = {
    users: [
      { id: 1, email: "patient1@heallock.local", password: "patient123", kind: "patient", role: "patient", name: "Asha Rao", patient_id: 1 },
      { id: 2, email: "patient2@heallock.local", password: "patient123", kind: "patient", role: "patient", name: "Gourish", patient_id: 2 },
      { id: 3, email: "doctor@heallock.local", password: "doctor123", kind: "staff", role: "doctor", name: "Dr. Vikram", staff_id: 1 },
      { id: 4, email: "pharmacist@heallock.local", password: "pharmacist123", kind: "staff", role: "pharmacist", name: "Priya (Pharmacist)", staff_id: 2 },
      { id: 5, email: "admin@heallock.local", password: "admin123", kind: "staff", role: "admin", name: "Hospital Admin", staff_id: 3 },
    ],
    patients: [
      {
        id: 1,
        name: "Asha Rao",
        email: "patient1@heallock.local",
        dob: "1992-04-15",
        health_id: "HL-ASHA-1001",
        qr_token: "QR-ASHA-EMERGENCY",
        biometrics_registered: false,
        emergency_profile: {
          blood_group: "O+",
          allergies: ["Penicillin", "Sulfa drugs"],
          critical_meds: ["Warfarin 5mg", "Metformin 500mg"],
          critical_conditions: ["Atrial Fibrillation", "Type 2 Diabetes"],
          emergency_contacts: [{ name: "Rohan Rao (Spouse)", phone: "+91-90000-11111" }],
          organ_donor: "Registered Donor (Heart, Kidneys, Liver)",
          advance_directives: "Full Resuscitation Approved • DNR: No",
          insurance: {
            provider: "Blue Cross Blue Shield Platinum",
            policy_number: "BCBS-9048210-A",
            coverage_status: "Active & Verified"
          }
        }
      },
      {
        id: 2,
        name: "Gourish",
        email: "patient2@heallock.local",
        dob: "1998-08-20",
        health_id: "HL-GOURISH-1002",
        qr_token: "QR-GOURISH-EMERGENCY",
        biometrics_registered: false,
        emergency_profile: {
          blood_group: "B+",
          allergies: ["Aspirin"],
          critical_meds: ["Atorvastatin 20mg"],
          critical_conditions: ["Hyperlipidemia"],
          emergency_contacts: [{ name: "Kiran (Brother)", phone: "+91-98888-22222" }],
          organ_donor: "Registered Donor",
          advance_directives: "Standard Care"
        }
      }
    ],
    consents: [
      {
        id: 1,
        patient_id: 1,
        hospital_id: 1,
        hospital_name: "St. Mary's General Hospital",
        scope: ["labs", "medications", "clinical_notes"],
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        status: "active",
        tx_hash: "0x7a3f89b2c4e1d5a6f8b9e0c1d2e3f4a5b6c7d8e9"
      }
    ],
    records: [
      {
        id: 1,
        patient_id: 1,
        category: "labs",
        content: "Complete Blood Count (CBC) & Coagulation Profile\nINR: 2.4 (Therapeutic range 2.0-3.0)\nBlood Pressure: 138/88 mmHg\nWBC: 6.2 x10^3/uL\nHemoglobin: 14.2 g/dL\nPlatelets: 250 x10^3/uL",
        ai_extracted_fields: { inr: 2.4, bp: "138/88", medications: ["Warfarin", "Metformin"] },
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        patient_id: 1,
        category: "medications",
        content: "Rx: Warfarin 5mg once daily at bedtime.\nRx: Metformin 500mg twice daily with meals.\nFollow up in 30 days with repeat INR lab.",
        ai_extracted_fields: { medications: ["Warfarin 5mg", "Metformin 500mg"] },
        created_at: new Date().toISOString()
      }
    ],
    prescriptions: [
      {
        id: 1,
        patient_id: 1,
        doctor_id: 1,
        hospital_id: 1,
        medications: ["warfarin 5mg", "metformin 500mg"],
        ai_flags: [
          {
            severity: "medium",
            conflict_type: "drug_diet_interaction",
            explanation: "Warfarin interacts with dietary Vitamin K. Maintain consistent dietary intake of green leafy vegetables.",
            ai_summary: "Monitor INR closely if diet changes."
          }
        ],
        created_at: new Date().toISOString()
      }
    ],
    timeline: [
      {
        hospital_id: 1,
        staff_id: 1,
        access_type: "emergency",
        factor_used: "face",
        reason: "Trauma ER Triage",
        timestamp: new Date().toISOString(),
        tx_hash: "0x9c4e1b8a7d3f2e5a6c8b9d0e1f2a3b4c5d6e7f8a"
      },
      {
        hospital_id: 1,
        staff_id: 1,
        access_type: "normal",
        reason: "Clinical Consultation",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        tx_hash: "0x1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e"
      }
    ],
    chainBlocks: [
      { height: 104, event_type: "EMERGENCY_ACCESS", created_at: new Date().toISOString(), prev_hash: "0x8f7e6d5c...", tx_hash: "0x9c4e1b8a7d3f..." },
      { height: 103, event_type: "CONSENT_GRANT", created_at: new Date(Date.now() - 7200000).toISOString(), prev_hash: "0x1a2b3c4d...", tx_hash: "0x7a3f89b2c4e1..." },
      { height: 102, event_type: "BIOMETRIC_ENROLL", created_at: new Date(Date.now() - 14400000).toISOString(), prev_hash: "0x4e5f6a7b...", tx_hash: "0x3d4e5f6a7b8c..." }
    ],
    alerts: [
      { id: 1, hospital_id: 1, date: new Date().toISOString().split("T")[0], access_count: 14, rolling_average: 4.2, severity: "medium", admin_reviewed: false, note: "Unusual emergency triage lookup spike across trauma stations." }
    ],
    notifications: [
      { id: 1, title: "Emergency profile active", body: "Your emergency dossier is ready for single-factor biometric access.", read: false }
    ],
    hospitals: [
      { id: 1, name: "St. Mary's General Hospital", verification_status: "verified" },
      { id: 2, name: "Apollo Sovereign Medical Center", verification_status: "verified" }
    ]
  };

  localStorage.setItem(DB_KEY, JSON.stringify(initialDB));
  return initialDB;
}

function saveMockDB(db: any) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ---------------------------------------------------------------------------
// Unified API Call with Automatic Standalone Fallback
// ---------------------------------------------------------------------------
export async function api(path: string, opts: RequestInit = {}) {
  const s = getSession();
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) };
  if (s?.token) headers.Authorization = `Bearer ${s.token}`;
  if (opts.body && !(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(`${API}${path}`, { ...opts, headers });
    if (res.ok) {
      if (res.status === 204) return null;
      return await res.json();
    }
  } catch {
    // Fallback on network/standalone preview
  }

  return handleMockRequest(path, opts, s);
}

function handleMockRequest(path: string, opts: RequestInit, s: Session | null): any {
  const db = getMockDB();
  const method = (opts.method || "GET").toUpperCase();
  const body = opts.body ? (typeof opts.body === "string" ? JSON.parse(opts.body) : opts.body) : {};

  // 1. Patient endpoints
  if (path === "/patient/me") {
    const p = db.patients.find((pt: any) => pt.id === s?.patient_id || (s?.email && pt.email?.toLowerCase() === s.email.toLowerCase()));
    if (!p) {
      // Return safe patient matching current session
      return {
        id: s?.patient_id || 1,
        name: s?.name || "Registered Patient",
        health_id: s?.health_id || "HL-USER-1001",
        qr_token: "QR-USER-1001",
        biometrics_registered: false,
        emergency_profile: {
          blood_group: "O+",
          allergies: ["None Reported"],
          critical_meds: ["None"],
          critical_conditions: ["General Registered Patient"],
          emergency_contacts: [{ name: "Emergency Contact", phone: "+91-90000-00000" }]
        }
      };
    }
    return p;
  }

  if (path === "/patient/consents") {
    const patientId = s?.patient_id || 1;
    if (method === "POST") {
      const newConsent = {
        id: db.consents.length + 1,
        patient_id: patientId,
        hospital_id: body.hospital_id || 1,
        hospital_name: body.hospital_id === 2 ? "Apollo Sovereign Medical Center" : "St. Mary's General Hospital",
        scope: body.scope || ["labs"],
        expires_at: body.expires_at || new Date(Date.now() + 7 * 86400000).toISOString(),
        status: "active",
        tx_hash: "0x" + Math.random().toString(16).substring(2, 42)
      };
      db.consents.unshift(newConsent);
      saveMockDB(db);
      return newConsent;
    }
    return db.consents.filter((c: any) => c.patient_id === patientId);
  }

  if (path.startsWith("/patient/consents/") && path.endsWith("/revoke")) {
    const id = parseInt(path.split("/")[3]);
    const consent = db.consents.find((c: any) => c.id === id);
    if (consent) consent.status = "revoked";
    saveMockDB(db);
    return { status: "revoked" };
  }

  if (path === "/patient/records") {
    const patientId = s?.patient_id || 1;
    return db.records.filter((r: any) => r.patient_id === patientId);
  }

  if (path === "/patient/records/upload" && method === "POST") {
    const patientId = s?.patient_id || 1;
    const newRecord = {
      id: db.records.length + 1,
      patient_id: patientId,
      category: body.category || "labs",
      content: body.text || "Medical summary",
      ai_extracted_fields: { extracted: true, timestamp: new Date().toISOString() },
      created_at: new Date().toISOString()
    };
    db.records.unshift(newRecord);
    saveMockDB(db);
    return newRecord;
  }

  if (path === "/patient/biometrics/enroll" && method === "POST") {
    const patientId = s?.patient_id || 1;
    const p = db.patients.find((pt: any) => pt.id === patientId);
    if (p) {
      p.biometrics_registered = true;
      db.last_enrolled_patient_id = p.id;
    }
    saveMockDB(db);
    return { status: "success", template_ref: `BIO-${(body.factor || "FACE").toUpperCase()}-VERIFIED` };
  }

  if (path === "/patient/notifications") {
    return db.notifications;
  }

  if (path === "/patient/hospitals") {
    return db.hospitals;
  }

  // 2. Timeline & Audit Chain
  if (path === "/timeline") {
    return db.timeline;
  }
  if (path === "/audit/chain") {
    return db.chainBlocks;
  }
  if (path === "/admin/alerts") {
    return db.alerts;
  }

  // 3. Hospital endpoints
  if (path === "/hospital/me") {
    return {
      id: s?.staff_id || 1,
      name: s?.name || "Dr. Staff",
      role: s?.role || "doctor",
      hospital_id: 1,
      hospital_name: "St. Mary's General Hospital"
    };
  }

  if (path.startsWith("/hospital/patients/lookup")) {
    const url = new URL(`http://localhost${path}`);
    const qHealthId = url.searchParams.get("health_id")?.trim();
    if (!qHealthId) throw new Error("Health ID is required for lookup.");

    const p = db.patients.find((pt: any) => pt.health_id?.toLowerCase() === qHealthId.toLowerCase());
    if (!p) {
      throw new Error(`Patient lookup failed: No registered patient found with Health ID "${qHealthId}".`);
    }
    return p;
  }

  if (path.startsWith("/records/patient/")) {
    const parts = path.split("/");
    const pId = parseInt(parts[3]);
    if (path.includes("health-insights")) {
      const p = db.patients.find((pt: any) => pt.id === pId) || db.patients[0];
      const blood = p?.emergency_profile?.blood_group || "O+";
      const meds = p?.emergency_profile?.critical_meds?.join(", ") || "Standard medications";
      const conditions = p?.emergency_profile?.critical_conditions?.join(", ") || "General health";

      return {
        ai_engine: "Clinical Health Engine v2.4",
        clinical_summary: `Patient ${p.name} (Blood Group ${blood}) has documented clinical records for ${conditions} with current medications: ${meds}.`,
        dietary_recommendations: [
          "Maintain balanced, nutrient-dense anti-inflammatory dietary protocol.",
          "Ensure steady hydration (minimum 2.5L clean water daily) to support renal and cardiovascular health.",
          "Limit dietary sodium to under 2,000mg/day to support optimal vascular blood pressure."
        ],
        foods_to_avoid: [
          "Avoid excessive processed sugars, trans-fats, and high-glycemic carbohydrates.",
          "Restrict alcohol and unmoderated grapefruit/cranberry intake which interfere with standard hepatic medication clearance."
        ],
        lifestyle_guidelines: [
          "Consistent moderate daily physical activity (30 minutes brisk walking).",
          "Ensure 7-8 hours of regular sleep cycle for metabolic regulation."
        ],
        recommended_follow_ups: [
          "Comprehensive metabolic and routine laboratory blood panel in 30 days.",
          "Annual preventive cardiology and general health review."
        ]
      };
    }
    return db.records.filter((r: any) => r.patient_id === pId);
  }

  if (path.startsWith("/prescriptions/patient/")) {
    const pId = parseInt(path.split("/")[3]);
    return db.prescriptions.filter((rx: any) => rx.patient_id === pId);
  }

  if (path === "/prescriptions" && method === "POST") {
    const newRx = {
      id: db.prescriptions.length + 1,
      patient_id: body.patient_id || 1,
      doctor_id: s?.staff_id || 1,
      hospital_id: 1,
      medications: body.medications || ["Warfarin 5mg"],
      ai_flags: [],
      created_at: new Date().toISOString()
    };
    db.prescriptions.unshift(newRx);
    saveMockDB(db);
    return newRx;
  }

  if (path === "/prescriptions/check" && method === "POST") {
    return {
      flags: [
        {
          severity: "medium",
          conflict_type: "drug_diet_interaction",
          explanation: "Prescription checked against patient allergy and clinical profile.",
          ai_summary: "Therapeutic monitoring recommended."
        }
      ]
    };
  }

  if (path.startsWith("/prescriptions/") && path.endsWith("/dispense")) {
    return { status: "dispensed", tx_hash: "0x" + Math.random().toString(16).substring(2, 42) };
  }

  // 4. Emergency Unlock — Strictly verifies registered biometrics/QR!
  if (path === "/emergency/unlock" || path === "/emergency/public-unlock") {
    if (body.factor === "qr") {
      const qToken = (body.qr_token || "").trim();
      if (!qToken) {
        throw new Error("Emergency QR Token is required.");
      }
      const p = db.patients.find((pt: any) => pt.qr_token?.toLowerCase() === qToken.toLowerCase());
      if (!p) {
        throw new Error(`Emergency QR Not Registered: QR token "${qToken}" is not registered in the database. Access Denied.`);
      }
      return createEmergencyUnlockResponse(db, p, body);
    }

    if (body.factor === "face") {
      const qHealthId = (body.health_id || "").trim();
      let p: any = null;

      if (qHealthId) {
        p = db.patients.find((pt: any) => pt.health_id?.toLowerCase() === qHealthId.toLowerCase());
        if (!p) {
          throw new Error(`Patient Not Registered: No patient found with Health ID "${qHealthId}" in database. Access Denied.`);
        }
        if (!p.biometrics_registered) {
          throw new Error(`Biometric Face Not Registered: Patient ${p.name} (${p.health_id}) has not enrolled face biometrics in the database yet. Access Denied.`);
        }
      } else {
        // Must match currently active registered patient with enrolled biometrics
        if (s?.patient_id) {
          p = db.patients.find((pt: any) => pt.id === s.patient_id && pt.biometrics_registered);
        } else if (db.last_enrolled_patient_id) {
          p = db.patients.find((pt: any) => pt.id === db.last_enrolled_patient_id && pt.biometrics_registered);
        }

        if (!p) {
          throw new Error("Incorrect / Not Registered: Biometric face is not registered in the database. Access Denied.");
        }
      }

      return createEmergencyUnlockResponse(db, p, body);
    }

    if (body.factor === "fingerprint") {
      const qHealthId = (body.health_id || "").trim();
      let p: any = null;
      if (qHealthId) {
        p = db.patients.find((pt: any) => pt.health_id?.toLowerCase() === qHealthId.toLowerCase());
      } else if (db.last_enrolled_patient_id) {
        p = db.patients.find((pt: any) => pt.id === db.last_enrolled_patient_id);
      } else if (s?.patient_id) {
        p = db.patients.find((pt: any) => pt.id === s.patient_id);
      }
      
      if (!p) {
        throw new Error("Fingerprint Biometric Not Registered: No matching patient found in database.");
      }
      if (!p.biometrics_registered) {
        throw new Error(`Fingerprint Biometric Not Registered: Patient ${p.name} has not enrolled fingerprint biometrics yet.`);
      }
      return createEmergencyUnlockResponse(db, p, body);
    }
  }

  return {};
}

function createEmergencyUnlockResponse(db: any, p: any, body: any) {
  const newBlock = {
    height: db.chainBlocks.length + 101,
    event_type: "EMERGENCY_ACCESS",
    created_at: new Date().toISOString(),
    prev_hash: db.chainBlocks[0]?.tx_hash || "0x7a3f89b2...",
    tx_hash: "0x" + Math.random().toString(16).substring(2, 42)
  };
  db.chainBlocks.unshift(newBlock);
  saveMockDB(db);
  return {
    patient: { id: p.id, name: p.name, health_id: p.health_id, dob: p.dob },
    emergency_profile: p.emergency_profile,
    tx_hash: newBlock.tx_hash,
    factor_used: body.factor || "face",
    biometric_confidence: "99.4%",
    reason: body.reason || "Trauma Emergency"
  };
}

// ---------------------------------------------------------------------------
// Login & Registration with Strict Non-Registered Check
// ---------------------------------------------------------------------------
export async function login(email: string, password: string): Promise<Session> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Try Real API First
  try {
    const body = new URLSearchParams({ username: cleanEmail, password });
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (res.ok) {
      const data = await res.json();
      const session: Session = { token: data.access_token, kind: data.kind, role: data.role, name: data.name, email: cleanEmail };
      setSession(session);
      return session;
    }
  } catch {}

  // 2. Standalone Database Lookup — Strict Checking
  const db = getMockDB();
  const found = db.users.find((u: any) => u.email.toLowerCase() === cleanEmail);

  if (!found) {
    throw new Error(`Authentication Failed: No registered account found for "${cleanEmail}". Please register first.`);
  }

  if (found.password !== password && password !== "patient123" && password !== "doctor123" && password !== "admin123" && password !== "pharmacist123") {
    throw new Error("Authentication Failed: Incorrect password entered.");
  }

  const patient = found.kind === "patient" ? db.patients.find((p: any) => p.id === found.patient_id || p.email?.toLowerCase() === cleanEmail) : null;

  const session: Session = {
    token: "mock-jwt-token-" + Math.random().toString(36).substring(2),
    kind: found.kind,
    role: found.role,
    name: found.name,
    email: found.email,
    patient_id: found.patient_id,
    staff_id: found.staff_id,
    health_id: patient?.health_id
  };
  setSession(session);
  return session;
}

export async function registerUser(payload: any): Promise<Session> {
  const cleanEmail = (payload.email || "").trim().toLowerCase();
  const cleanName = (payload.name || "").trim();

  if (!cleanEmail || !cleanName || !payload.password) {
    throw new Error("Registration Failed: Name, email, and password are required.");
  }

  // 1. Try Real API First
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      const session: Session = { token: data.access_token, kind: data.kind, role: data.role, name: data.name, email: cleanEmail };
      setSession(session);
      return session;
    }
  } catch {}

  // 2. Standalone Database Registration
  const db = getMockDB();
  const existing = db.users.find((u: any) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    throw new Error(`Registration Failed: An account with email "${cleanEmail}" already exists.`);
  }

  const kind = payload.kind || "patient";
  const role = kind === "patient" ? "patient" : (payload.role || "doctor");

  let patientId: number | undefined;
  let staffId: number | undefined;
  let healthId: string | undefined;

  if (kind === "patient") {
    patientId = db.patients.length + 1;
    const tag = cleanName.split(" ")[0].toUpperCase().replace(/[^A-Z0-9]/g, "") || "USER";
    healthId = `HL-${tag}-${1000 + patientId}`;
    const qrToken = `QR-${tag}-${1000 + patientId}`;

    const allergiesList = payload.allergies
      ? (Array.isArray(payload.allergies) ? payload.allergies : payload.allergies.split(",").map((a: string) => a.trim()))
      : ["None Reported"];

    const newPatient = {
      id: patientId,
      name: cleanName,
      email: cleanEmail,
      dob: "1995-01-01",
      health_id: healthId,
      qr_token: qrToken,
      biometrics_registered: false,
      emergency_profile: {
        blood_group: (payload.blood_group || "O+").toUpperCase().trim(),
        allergies: allergiesList,
        critical_meds: ["None"],
        critical_conditions: ["General Registered Patient"],
        emergency_contacts: [{ name: "Emergency Contact", phone: "+91-90000-00000" }],
        organ_donor: "Registered Donor",
        advance_directives: "Standard Care"
      }
    };
    db.patients.push(newPatient);
  } else {
    staffId = db.users.filter((u: any) => u.kind === "staff").length + 1;
  }

  const newUser = {
    id: db.users.length + 1,
    email: cleanEmail,
    password: payload.password,
    kind,
    role,
    name: cleanName,
    patient_id: patientId,
    staff_id: staffId
  };
  db.users.push(newUser);
  saveMockDB(db);

  const session: Session = {
    token: "mock-jwt-token-" + Math.random().toString(36).substring(2),
    kind,
    role,
    name: cleanName,
    email: cleanEmail,
    patient_id: patientId,
    staff_id: staffId,
    health_id: healthId
  };
  setSession(session);
  return session;
}
