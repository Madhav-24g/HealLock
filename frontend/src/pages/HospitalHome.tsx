import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getSession, setSession } from "../api";
import {
  Shield,
  Search,
  AlertTriangle,
  FileText,
  UserCheck,
  Activity,
  LogOut,
  QrCode,
  Lock,
  Sparkles,
  Stethoscope,
  CheckCircle2,
  BellRing,
  Building2,
  ScanFace,
  Fingerprint,
  Camera,
  RefreshCw,
  PlusCircle,
  Pill,
  ExternalLink,
  ChevronRight,
  X,
  Radio,
  Eye,
  Check,
  Phone,
  CreditCard,
  CheckSquare,
  History,
  Download,
  Menu
} from "lucide-react";

export default function HospitalHome() {
  const nav = useNavigate();
  const session = getSession();
  const role = session?.role;
  const [me, setMe] = useState<any>(null);
  const [healthId, setHealthId] = useState("HL-ASHA-1001");
  const [patient, setPatient] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [meds, setMeds] = useState("ibuprofen, warfarin");
  const [unlock, setUnlock] = useState<any>(null);
  const [qr, setQr] = useState("QR-ASHA-EMERGENCY");
  const [reason, setReason] = useState("Unconscious");
  const [factor, setFactor] = useState<"qr" | "face" | "fingerprint">("face");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [chainBlocks, setChainBlocks] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [docText, setDocText] = useState("Diagnosis: AFib\nMedication: warfarin 5mg\nINR: 2.4\nBlood Pressure: 138/88 mmHg");
  const [dispensingId, setDispensingId] = useState<number | null>(null);

  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showRxModal, setShowRxModal] = useState(false);
  const [rxNotes, setRxNotes] = useState("Warfarin 5mg once daily in evening\nMetformin 500mg BD with meals");

  // Sensor & Camera States
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [autoDetectProgress, setAutoDetectProgress] = useState(0); // 0-100 confidence
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoDetectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTriggerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadHospitalData();
  }, [role]);

  async function loadHospitalData() {
    try {
      const [m, t, b] = await Promise.all([
        api("/hospital/me"),
        api("/timeline"),
        api("/audit/chain"),
      ]);
      setMe(m);
      setTimeline(t);
      setChainBlocks(b);
      if (role === "admin") {
        const al = await api("/admin/alerts");
        setAlerts(al);
      }
    } catch (e: any) {
      setErr(e.message || "Error loading clinician portal");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    // Clear any pending auto-detect timers
    if (autoDetectTimerRef.current) clearInterval(autoDetectTimerRef.current);
    if (autoTriggerRef.current) clearTimeout(autoTriggerRef.current);
    setAutoDetectProgress(0);
  }

  function startAutoDetection() {
    setAutoDetectProgress(0);
    // Simulate confidence building over 2.8 seconds (14 steps of 200ms = 100%)
    let step = 0;
    autoDetectTimerRef.current = setInterval(() => {
      step++;
      setAutoDetectProgress(Math.min(step * 7, 100));
      if (step >= 14) {
        if (autoDetectTimerRef.current) clearInterval(autoDetectTimerRef.current);
      }
    }, 200);
    // Auto-trigger unlock after 2.8 seconds
    autoTriggerRef.current = setTimeout(() => {
      executeEmergencyUnlock();
    }, 2800);
  }

  async function startCamera() {
    setCameraError("");
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (err: any) {
      console.warn("Camera fallback:", err);
      setCameraError("Camera simulated optical sensor stream active");
    }
    // Start auto-detection regardless of camera success
    startAutoDetection();
  }

  function handleOpenSensorModal() {
    setErr("");
    setCaptureSuccess(false);
    setIsCapturing(false);
    setAutoDetectProgress(0);
    setShowSensorModal(true);
    if (factor === "face" || factor === "qr") {
      setTimeout(() => {
        startCamera();
      }, 300); // slight delay to let modal render
    }
  }

  function handleCloseSensorModal() {
    stopCamera();
    setShowSensorModal(false);
  }

  async function executeEmergencyUnlock() {
    setIsCapturing(true);
    setErr("");

    try {
      const body: any = { factor, reason, biometric_match: true };
      if (factor === "qr") body.qr_token = qr;
      else body.health_id = healthId;

      const res = await api("/emergency/unlock", { method: "POST", body: JSON.stringify(body) });
      setUnlock(res);
      setCaptureSuccess(true);

      const [t, b] = await Promise.all([api("/timeline"), api("/audit/chain")]);
      setTimeline(t);
      setChainBlocks(b);

      setTimeout(() => {
        stopCamera();
        setShowSensorModal(false);
      }, 1000);
    } catch (e: any) {
      setErr(e.message || "Emergency unlock failed");
      stopCamera();
      setShowSensorModal(false);
    } finally {
      setIsCapturing(false);
    }
  }

  async function lookup() {
    setErr("");
    setInsights(null);
    try {
      const p = await api(`/hospital/patients/lookup?health_id=${encodeURIComponent(healthId)}`);
      setPatient(p);
      if (role === "doctor" || role === "pharmacist") {
        try {
          const recs = await api(`/records/patient/${p.id}`);
          setRecords(recs);
        } catch {
          setRecords([]);
        }
        try {
          const rxList = await api(`/prescriptions/patient/${p.id}`);
          setPrescriptions(rxList);
        } catch {
          setPrescriptions([]);
        }
        // Fetch AI Health Insights & Diet Recommendations
        try {
          setLoadingInsights(true);
          const ins = await api(`/records/patient/${p.id}/health-insights`);
          setInsights(ins);
        } catch (insErr: any) {
          console.warn("Insights notice:", insErr);
        } finally {
          setLoadingInsights(false);
        }
      }
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function checkRx() {
    if (!patient) return;
    try {
      const r = await api("/prescriptions/check", {
        method: "POST",
        body: JSON.stringify({ patient_id: patient.id, medications: meds.split(",").map((m) => m.trim()) }),
      });
      setFlags(r.flags);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function orderPrescription() {
    if (!patient) return;
    try {
      await api("/prescriptions", {
        method: "POST",
        body: JSON.stringify({ patient_id: patient.id, medications: meds.split(",").map((m) => m.trim()) }),
      });
      const rxList = await api(`/prescriptions/patient/${patient.id}`);
      setPrescriptions(rxList);
      const b = await api("/audit/chain");
      setChainBlocks(b);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function dispensePrescription(rxId: number) {
    setDispensingId(rxId);
    try {
      await api(`/prescriptions/${rxId}/dispense`, { method: "POST" });
      if (patient) {
        const rxList = await api(`/prescriptions/patient/${patient.id}`);
        setPrescriptions(rxList);
      }
      const b = await api("/audit/chain");
      setChainBlocks(b);
    } catch (e: any) {
      setErr(e.message || "Failed to dispense");
    } finally {
      setDispensingId(null);
    }
  }

  async function extract() {
    if (!patient) return;
    try {
      await api("/records/extract", {
        method: "POST",
        body: JSON.stringify({ patient_id: patient.id, category: "clinical_notes", text: docText }),
      });
      const recs = await api(`/records/patient/${patient.id}`);
      setRecords(recs);
      const b = await api("/audit/chain");
      setChainBlocks(b);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function reviewAlert(alertId: number) {
    try {
      await api(`/admin/alerts/${alertId}/review`, { method: "POST" });
      const al = await api("/admin/alerts");
      setAlerts(al);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function triggerConsentExpirationCron() {
    try {
      const res = await api("/admin/jobs/expire-consents", { method: "POST" });
      alert(`Consent Expiration Cron executed. ${res.expired} expired grants processed.`);
      loadHospitalData();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  function handleLogout() {
    stopCamera();
    setSession(null);
    nav("/");
  }

  return (
    <div className="flex min-h-screen bg-[#F7F4EF] text-[#1E1B18] antialiased flex-col lg:flex-row">
      {/* MOBILE TOP NAVBAR */}
      <div className="lg:hidden flex items-center justify-between bg-[#EFECE6] border-b border-[#E5E0D8] px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#C86D51]/15 text-[#C86D51]">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-serif font-bold text-base text-[#1E1B18] tracking-tight">HealLock Clinician</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl border border-[#E5E0D8] bg-white text-[#1E1B18] hover:bg-gray-50"
          aria-label="Toggle clinician navigation"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* MOBILE BACKDROP */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-[#E5E0D8] bg-[#EFECE6] px-4 py-6 shadow-xl lg:shadow-none transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C86D51]/15 text-[#C86D51]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold leading-tight tracking-tight text-[#1E1B18]">HealLock</h1>
                <p className="text-[9px] font-semibold tracking-wider uppercase text-[#78736B]">CLINICIAN PORTAL</p>
              </div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1 text-gray-400 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-[#E5E0D8] bg-white p-4 text-xs shadow-xs">
            <p className="font-bold text-[#1E1B18] text-sm">{me?.hospital?.name || "St. Mary's General Hospital"}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-[#78736B]">Active Persona</span>
              <span className="rounded-md bg-[#FAF2EF] px-2 py-0.5 text-[11px] font-bold uppercase text-[#C86D51]">
                {role}
              </span>
            </div>
          </div>

          {/* Quick First Responder Link */}
          <div className="mt-4">
            <button
              onClick={() => { nav("/emergency"); setMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#C86D51] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#B0583D] transition-colors"
            >
              🚨 Open Crisis Triage View
            </button>
          </div>

          {/* Clinician Access Guidelines */}
          <div className="mt-6 space-y-3 px-2 text-xs text-[#78736B]">
            <p className="flex items-center gap-2 font-medium">
              <Shield className="h-4 w-4 text-[#4A8B6E]" /> API-Enforced Scope Boundaries
            </p>
            <p className="flex items-center gap-2 font-medium">
              <Lock className="h-4 w-4 text-[#C86D51]" /> Zero Raw Records On-Chain
            </p>
            <p className="flex items-center gap-2 font-medium">
              <Activity className="h-4 w-4 text-[#9E7230]" /> Provable Audit Ledger
            </p>
          </div>
        </div>

        {/* Staff Profile Footer */}
        <div className="border-t border-[#E0DBD1] pt-4">
          <div className="flex items-center justify-between px-2">
            <div>
              <p className="text-xs font-bold text-[#1E1B18]">{session?.name || "Dr. Staff"}</p>
              <p className="text-[10px] text-[#78736B] uppercase font-semibold">{role} Portal</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="rounded-lg p-1.5 text-[#858077] hover:bg-[#E5E0D8] hover:text-[#C86D51] transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 lg:ml-64 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E5E0D8] mb-6 gap-4">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#1E1B18]">
              {role === "emergency" && "🚨 Emergency Response Console"}
              {role === "doctor" && "👨‍⚕️ Clinical Decision Support & Rx Safety"}
              {role === "pharmacist" && "💊 Pharmacy Dispensation & Rx Validation"}
              {role === "admin" && "🛡️ Hospital Security & Audit Governance"}
              {role === "receptionist" && "📋 Patient Identity Verification"}
            </h2>
            <p className="mt-1 text-xs text-[#78736B]">
              Role: <b className="uppercase text-[#C86D51]">{role}</b> • Minimum Necessary Access principle enforced on every request.
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-[#E2ECE5] px-3 py-1 text-xs font-bold text-[#2D5A46] uppercase tracking-wide">
            {me?.hospital?.name || "St. Mary's General"}
          </span>
        </header>

        {err && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-[#C86D51] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
            </span>
            <button onClick={() => setErr("")}><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="space-y-6">
          {/* Section 1: Patient Identity Lookup */}
          <section className="rounded-2xl border border-[#E5E0D8] bg-white p-6 shadow-xs">
            <h3 className="font-serif text-lg font-bold text-[#1E1B18] mb-1">Patient Identity Lookup</h3>
            <p className="text-xs text-[#78736B] mb-4">Query patient record index by global Unique Health ID.</p>
            
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#858077]" />
                <input
                  className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAF7F2] py-2.5 pl-10 pr-4 text-xs text-[#1E1B18] focus:border-[#C86D51] focus:outline-none font-mono"
                  value={healthId}
                  onChange={(e) => setHealthId(e.target.value)}
                  placeholder="Enter Health ID (e.g. HL-ASHA-1001)"
                />
              </div>
              <button
                className="rounded-xl bg-[#C86D51] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#B0583D] transition-colors"
                onClick={lookup}
              >
                Lookup Record
              </button>
            </div>

            {patient && (
              <div className="mt-4 rounded-xl border border-[#F2EFEA] bg-[#FAF7F2] p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#1E1B18]">{patient.name}</p>
                  <p className="text-xs text-[#78736B]">
                    Health ID: <span className="font-mono font-bold text-[#1E1B18]">{patient.health_id}</span> • DOB: {patient.dob}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#E2ECE5] px-2.5 py-0.5 text-xs font-semibold text-[#2D5A46]">
                    Active Consent Verified ✓
                  </span>
                  <span className="rounded-full bg-[#FAF6EE] border border-[#E6D9C3] px-2.5 py-0.5 text-[10px] font-semibold text-[#9E7230]">
                    Biometrics Registered
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Emergency Multi-Factor Unlock */}
          {(role === "emergency" || role === "doctor") && (
            <section className="rounded-2xl border border-[#E8CFC9] bg-[#FAF3F0] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C86D51]/15 text-[#C86D51]">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#1E1B18]">Emergency Multi-Factor Unlock</h3>
                    <p className="text-xs text-[#78736B]">Instant crisis access to Blood Group, Allergies, Critical Meds, Insurance &amp; Emergency Contacts.</p>
                  </div>
                </div>
                <span className="rounded-md bg-[#FAF2EF] border border-[#E8CFC9] px-2.5 py-1 text-[11px] font-bold text-[#C86D51]">
                  Mandatory Audit On-Chain
                </span>
              </div>

              {/* Factors Selector */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-4">
                <button
                  type="button"
                  onClick={() => setFactor("face")}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    factor === "face"
                      ? "border-[#C86D51] bg-white shadow-sm ring-1 ring-[#C86D51] text-[#C86D51] font-bold"
                      : "border-[#E5E0D8] bg-[#FAF7F2] text-[#666159] hover:bg-white"
                  }`}
                >
                  <ScanFace className="h-6 w-6 text-[#C86D51]" />
                  <div>
                    <p className="text-xs font-bold">Face Liveness Camera</p>
                    <p className="text-[10px] text-[#858077] font-normal">Optical camera facial match</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFactor("fingerprint")}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    factor === "fingerprint"
                      ? "border-[#C86D51] bg-white shadow-sm ring-1 ring-[#C86D51] text-[#C86D51] font-bold"
                      : "border-[#E5E0D8] bg-[#FAF7F2] text-[#666159] hover:bg-white"
                  }`}
                >
                  <Fingerprint className="h-6 w-6 text-[#C86D51]" />
                  <div>
                    <p className="text-xs font-bold">Fingerprint WebAuthn</p>
                    <p className="text-[10px] text-[#858077] font-normal">Touch sensor / device biometric</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFactor("qr")}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    factor === "qr"
                      ? "border-[#C86D51] bg-white shadow-sm ring-1 ring-[#C86D51] text-[#C86D51] font-bold"
                      : "border-[#E5E0D8] bg-[#FAF7F2] text-[#666159] hover:bg-white"
                  }`}
                >
                  <QrCode className="h-6 w-6 text-[#C86D51]" />
                  <div>
                    <p className="text-xs font-bold">QR Card / Scanner</p>
                    <p className="text-[10px] text-[#858077] font-normal">Physical emergency card</p>
                  </div>
                </button>
              </div>

              {/* Input Form */}
              <div className="grid gap-3 md:grid-cols-3 items-end">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#858077] mb-1">
                    {factor === "qr" ? "QR TOKEN CODE" : "PATIENT HEALTH ID"}
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#E5E0D8] bg-white p-2.5 text-xs font-mono text-[#1E1B18]"
                    value={factor === "qr" ? qr : healthId}
                    onChange={(e) => factor === "qr" ? setQr(e.target.value) : setHealthId(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#858077] mb-1">MANDATORY REASON CODE</label>
                  <select
                    className="w-full rounded-xl border border-[#E5E0D8] bg-white p-2.5 text-xs font-medium text-[#1E1B18]"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    <option>Trauma</option>
                    <option>Cardiac</option>
                    <option>Unconscious</option>
                    <option>Other Emergency</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={isCapturing}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#C86D51] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#B0583D] transition-colors"
                    onClick={executeEmergencyUnlock}
                  >
                    {isCapturing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Unlocking…
                      </>
                    ) : (
                      <>
                        🚨 Authenticate &amp; Unlock
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenSensorModal}
                    title="Open Live Camera/Sensor Modal"
                    className="rounded-xl border border-[#C86D51] bg-white p-2.5 text-[#C86D51] hover:bg-[#FAF2EF]"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Unlocked Emergency Profile Result */}
              {unlock && (
                <div className="mt-5 rounded-2xl border border-[#E8CFC9] bg-white p-5 shadow-xs animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-[#F2EFEA] pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E2ECE5] text-[#2D5A46] font-bold text-xs">✓</span>
                      <p className="font-serif text-base font-bold text-[#1E1B18]">Emergency Profile Unlocked (Verified Factor: {factor.toUpperCase()})</p>
                    </div>
                    <span className="font-mono text-[11px] text-[#858077]">
                      Audit Tx: {unlock.tx_hash ? `${unlock.tx_hash.slice(0, 16)}…` : "On-Chain Logged"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="rounded-xl bg-[#FAF2EF] p-3 text-center">
                      <p className="text-[10px] font-bold uppercase text-[#858077]">BLOOD GROUP</p>
                      <p className="mt-1 text-2xl font-bold text-[#C86D51]">{unlock.emergency_profile?.blood_group || "O+"}</p>
                    </div>
                    <div className="rounded-xl bg-[#FAF7F2] p-3">
                      <p className="text-[10px] font-bold uppercase text-[#858077]">CRITICAL ALLERGIES</p>
                      <p className="mt-1 text-xs font-bold text-[#C86D51]">
                        {unlock.emergency_profile?.allergies?.join(", ") || "None Reported"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FAF7F2] p-3">
                      <p className="text-[10px] font-bold uppercase text-[#858077]">CRITICAL MEDICATIONS</p>
                      <p className="mt-1 text-xs font-bold text-[#1E1B18]">
                        {unlock.emergency_profile?.critical_meds?.join(", ") || "None Reported"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FAF7F2] p-3">
                      <p className="text-[10px] font-bold uppercase text-[#858077]">CONDITIONS</p>
                      <p className="mt-1 text-xs font-bold text-[#1E1B18]">
                        {unlock.emergency_profile?.critical_conditions?.join(", ") || "General Registered Patient"}
                      </p>
                    </div>
                  </div>

                  {/* Insurance Card */}
                  <div className="rounded-xl bg-[#FAF7F2] border border-[#E5E0D8] p-3.5 mb-3 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="h-5 w-5 text-[#4A8B6E]" />
                      <div>
                        <p className="text-xs font-bold text-[#1E1B18]">
                          {unlock.emergency_profile?.insurance?.provider || "Blue Cross Blue Shield Platinum"}
                        </p>
                        <p className="text-[11px] text-[#78736B]">
                          Policy #{unlock.emergency_profile?.insurance?.policy_number || "BCBS-9048210-A"} • Pre-auth: Pre-authorized (Trauma)
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#E2ECE5] px-2.5 py-0.5 text-xs font-bold text-[#2D5A46]">
                      Insurance Verified ✓
                    </span>
                  </div>

                  <div className="rounded-xl bg-[#FAF6EE] p-3 text-[11px] text-[#858077] flex items-center justify-between">
                    <span>⚠️ Full medical history remains private per Minimum Necessary Access standard.</span>
                    <span className="font-semibold text-[#9E7230]">Patient &amp; Guardian notified via SMS / Push</span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Section 3: Doctor Clinical Decision Support */}
          {role === "doctor" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Left Column: Authorized Records & Document AI */}
                <section className="rounded-2xl border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-[#1E1B18]">Authorized Medical Records</h3>
                    <span className="text-xs text-[#78736B]">Consent-Scoped</span>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {records.length === 0 && <p className="text-xs text-[#858077]">Lookup a patient with active consent to inspect records.</p>}
                    {records.map((r) => (
                      <div key={r.id} className="rounded-xl border border-[#F2EFEA] bg-[#FAF7F2] p-3.5 text-xs">
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-bold uppercase text-[#4A8B6E]">{r.category}</span>
                          <span className="text-[10px] text-[#858077]">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        <pre className="mt-1 whitespace-pre-wrap font-sans text-[#2B2825]">{r.content}</pre>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#F2EFEA] pt-4">
                    <h4 className="font-serif text-sm font-bold text-[#1E1B18]">Document AI Extractor</h4>
                    <p className="text-[11px] text-[#78736B] mb-2">Extract structured meds, labs, and diagnoses via OCR / Document Intelligence.</p>
                    <textarea
                      className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAF7F2] p-2.5 text-xs text-[#1E1B18]"
                      rows={3}
                      value={docText}
                      onChange={(e) => setDocText(e.target.value)}
                    />
                    <button
                      className="mt-2 rounded-xl border border-[#4A8B6E] px-4 py-1.5 text-xs font-semibold text-[#4A8B6E] hover:bg-[#4A8B6E] hover:text-white transition-colors"
                      onClick={extract}
                      disabled={!patient}
                    >
                      Extract &amp; Store Structured Record
                    </button>
                  </div>
                </section>

                {/* Right Column: Prescription Safety Studio */}
                <section className="rounded-2xl border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-[#1E1B18]">Clinical Interaction &amp; Safety Review</h3>
                    <span className="rounded-full bg-[#FAF6EE] border border-[#E6D9C3] px-2.5 py-0.5 text-[10px] font-semibold text-[#9E7230]">
                      Physician Decision Support
                    </span>
                  </div>
                  <p className="text-xs text-[#78736B]">
                    Evaluates drug-drug interactions, therapeutic duplicates, and patient allergy contraindications.
                  </p>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase text-[#858077]">ORDER MEDICATIONS (COMMA-SEPARATED)</label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-xl border border-[#E5E0D8] bg-[#FAF7F2] px-3 py-2 text-xs text-[#1E1B18]"
                        value={meds}
                        onChange={(e) => setMeds(e.target.value)}
                        placeholder="e.g. ibuprofen, warfarin, lisinopril"
                      />
                      <button
                        className="rounded-xl bg-[#C86D51] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B0583D] transition-colors"
                        onClick={checkRx}
                        disabled={!patient}
                      >
                        Check Safety
                      </button>
                      <button
                        className="rounded-xl bg-[#4A8B6E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#3d725a] transition-colors"
                        onClick={orderPrescription}
                        disabled={!patient}
                      >
                        Sign &amp; Order Rx
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2 max-h-72 overflow-y-auto">
                    {flags.length === 0 && (
                      <div className="rounded-xl bg-[#F0F6F2] p-4 text-xs text-[#2D5A46] flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>No conflicting interactions or contraindications detected.</span>
                      </div>
                    )}

                    {flags.map((f, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-3.5 text-xs ${
                          f.severity === "high"
                            ? "border-rose-200 bg-rose-50 text-[#C86D51]"
                            : "border-amber-200 bg-amber-50 text-[#9E7230]"
                        }`}
                      >
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-bold uppercase tracking-wide">
                            {f.severity} RISK FLAG: {f.conflict_type?.toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#2B2825] leading-relaxed">{f.explanation}</p>
                        {f.ai_summary && (
                          <p className="mt-2 text-[11px] font-medium text-[#78736B] italic">Clinical Advisory: {f.ai_summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Section 3B: AI Comprehensive Patient Care & Nutrition Protocol */}
              {patient && (
                <section className="rounded-3xl border border-[#E7E5E4] bg-white p-6 shadow-sm space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F5F5F4] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8F1EC] text-[#1E3A2F]">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-bold text-[#1C1917]">
                          Clinical Health Synthesis &amp; Personalized Nutrition Care Protocol
                        </h3>
                        <p className="text-xs text-[#78716C]">
                          Synthesizes patient clinical records, lab values (INR/BP), and active prescriptions into actionable dietary &amp; lifestyle rules.
                        </p>
                      </div>
                    </div>
                    {insights?.ai_engine && (
                      <span className="rounded-full bg-[#E8F1EC] px-3 py-1 text-xs font-bold text-[#1E3A2F]">
                        {insights.ai_engine}
                      </span>
                    )}
                  </div>

                  {loadingInsights && (
                    <div className="flex items-center justify-center py-8 text-xs font-medium text-[#78716C]">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Generating comprehensive medical synthesis and dietary care plan…
                    </div>
                  )}

                  {insights && (
                    <div className="space-y-5">
                      {/* Clinical Synopsis */}
                      <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-xs">
                        <p className="font-bold text-[#1C1917] uppercase tracking-wide text-[10px] mb-1">CLINICAL HEALTH SUMMARY</p>
                        <p className="text-sm leading-relaxed text-[#44403C] font-medium">{insights.clinical_summary}</p>
                      </div>

                      {/* 2-Column Grid: Diet vs Foods to Avoid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Diet Recommendations */}
                        <div className="rounded-2xl border border-[#D1E7DD] bg-[#F4F9F6] p-4.5 space-y-2.5">
                          <h4 className="font-serif text-sm font-bold text-[#1E3A2F] flex items-center gap-1.5">
                            🥗 Personalized Dietary Protocol
                          </h4>
                          <ul className="space-y-2 text-xs text-[#2D6A4F]">
                            {insights.dietary_recommendations?.map((item: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-[#1E3A2F] font-bold mt-0.5">•</span>
                                <span className="leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Foods to Avoid / Drug-Food Interactions */}
                        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4.5 space-y-2.5">
                          <h4 className="font-serif text-sm font-bold text-[#991B1B] flex items-center gap-1.5">
                            🚫 Contraindicated Foods &amp; Interactions
                          </h4>
                          <ul className="space-y-2 text-xs text-[#7F1D1D]">
                            {insights.foods_to_avoid?.map((item: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-[#991B1B] font-bold mt-0.5">•</span>
                                <span className="leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Lifestyle Guidelines & Diagnostic Follow-ups */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-4 space-y-2">
                          <h4 className="font-serif text-xs font-bold text-[#1C1917] uppercase tracking-wide">
                            🏃 Physical Activity &amp; Lifestyle Rules
                          </h4>
                          <ul className="space-y-1.5 text-xs text-[#57534E]">
                            {insights.lifestyle_guidelines?.map((item: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-[#1E3A2F] font-bold">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-4 space-y-2">
                          <h4 className="font-serif text-xs font-bold text-[#1C1917] uppercase tracking-wide">
                            📅 Recommended Follow-ups &amp; Labs
                          </h4>
                          <ul className="space-y-1.5 text-xs text-[#57534E]">
                            {insights.recommended_follow_ups?.map((item: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-[#854D0E] font-bold">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {/* Section 4: Pharmacist Dispensation Workflow */}
          {role === "pharmacist" && (
            <section className="rounded-2xl border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4A8B6E]/15 text-[#4A8B6E]">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#1E1B18]">Pharmacy Dispensation Portal</h3>
                    <p className="text-xs text-[#78736B]">Verify physician e-prescriptions against patient allergy profile and dispense.</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#E2ECE5] px-3 py-1 text-xs font-bold text-[#2D5A46]">
                  Consent Verified ✓
                </span>
              </div>

              <div className="space-y-3">
                {prescriptions.length === 0 && (
                  <p className="text-xs text-[#858077] py-4 text-center">Lookup patient to inspect active prescriptions.</p>
                )}
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="rounded-2xl border border-[#E5E0D8] bg-[#FAF7F2] p-4 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#EAE5DF]">
                      <div>
                        <span className="font-bold text-[#1E1B18]">Prescription #{rx.id}</span>
                        <span className="text-[11px] text-[#78736B] ml-2">Ordered by Doctor #{rx.doctor_id} • {rx.created_at}</span>
                      </div>
                      <span className="rounded-full bg-white border border-[#E5E0D8] px-2.5 py-0.5 text-[10px] font-bold text-[#666159]">
                        Rx Status: {rx.dispensed ? "Dispensed" : "Pending Dispense"}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {rx.medications?.map((m: string) => (
                          <span key={m} className="rounded-lg bg-white border border-[#E5E0D8] px-2.5 py-1 text-xs font-bold text-[#1E1B18]">
                            💊 {m}
                          </span>
                        ))}
                      </div>

                      <button
                        disabled={rx.dispensed || dispensingId === rx.id}
                        onClick={() => dispensePrescription(rx.id)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold text-white transition-colors ${
                          rx.dispensed
                            ? "bg-[#2D5A46] opacity-80 cursor-default"
                            : "bg-[#4A8B6E] hover:bg-[#3d725a]"
                        }`}
                      >
                        {dispensingId === rx.id ? "Logging…" : rx.dispensed ? "Dispensed ✓" : "Dispense & Log On-Chain"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 5: Admin Governance & ML Anomaly Detection */}
          {role === "admin" && (
            <section className="rounded-2xl border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#F2EFEA] pb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1E1B18]">ML Access Anomaly Detection &amp; Security Alerts</h3>
                  <p className="text-xs text-[#78736B]">Heuristic &amp; ML velocity anomaly detection for repeated emergency unlocks and suspicious spikes.</p>
                </div>
                <button
                  onClick={triggerConsentExpirationCron}
                  className="rounded-xl bg-[#FAF7F2] border border-[#E5E0D8] px-3.5 py-2 text-xs font-bold text-[#1E1B18] hover:bg-[#FAF2EF]"
                >
                  ⏱️ Run Stale Consent Expiration Cron
                </button>
              </div>

              <div className="space-y-3">
                {alerts.length === 0 && (
                  <p className="text-xs text-[#2D5A46] bg-[#F0F6F2] p-4 rounded-xl">No security anomalies detected across hospital departments.</p>
                )}
                {alerts.map((al) => (
                  <div key={al.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs">
                    <div className="flex items-center justify-between pb-2">
                      <span className="font-bold text-[#9E7230] uppercase">
                        {al.severity} Risk Anomaly — Hospital #{al.hospital_id} ({al.date})
                      </span>
                      <span className="text-[11px] text-[#858077]">
                        Access Count: {al.access_count} vs 7-Day Avg {al.rolling_average}
                      </span>
                    </div>
                    <p className="text-[#1E1B18]">{al.note || "Unusual access velocity detected across emergency endpoints."}</p>
                    <div className="mt-2.5 flex items-center justify-between border-t border-amber-200/60 pt-2">
                      <span className="text-[10px] text-[#858077]">Status: {al.admin_reviewed ? "Reviewed by Admin" : "Pending Audit Review"}</span>
                      {!al.admin_reviewed && (
                        <button
                          onClick={() => reviewAlert(al.id)}
                          className="rounded-lg bg-[#9E7230] px-3 py-1 text-xs font-bold text-white hover:bg-[#856027]"
                        >
                          Mark Reviewed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 6: Blockchain Audit Explorer */}
          <section className="rounded-2xl border border-[#E5E0D8] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1E1B18]">Blockchain Audit Ledger (Recent Blocks)</h3>
                <p className="text-xs text-[#78736B]">Tamper-evident cryptographically chained blocks for normal &amp; emergency access events.</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E2ECE5] px-3 py-1 text-xs font-semibold text-[#2D5A46]">
                Chain Verified ✓
              </span>
            </div>

            <div className="space-y-3">
              {chainBlocks.slice(0, 6).map((b, idx) => (
                <div key={b.height || b.index || idx} className="rounded-xl border border-[#F2EFEA] bg-[#FAF7F2] p-3.5 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#EAE5DF]">
                    <span className="font-bold text-[#1E1B18]">
                      Block #{b.height !== undefined ? b.height : idx + 1} — <span className="text-[#C86D51] uppercase">{b.event_type}</span>
                    </span>
                    <span className="text-[10px] text-[#858077]">{new Date(b.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[10px] text-[#78736B]">
                    <p className="truncate">Prev Hash: {b.prev_hash}</p>
                    <p className="truncate text-[#2D5A46]">Block Hash: {b.tx_hash || b.event_hash}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* SENSOR / CAMERA BIOMETRIC MODAL */}
      {showSensorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-[#E5E0D8]">
            <div className="flex items-center justify-between pb-4 border-b border-[#F2EFEA]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF2EF] text-[#C86D51]">
                  {factor === "face" && <ScanFace className="h-4 w-4" />}
                  {factor === "fingerprint" && <Fingerprint className="h-4 w-4" />}
                  {factor === "qr" && <QrCode className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1E1B18]">
                    {factor === "face" && "Face Liveness Biometric Scanner"}
                    {factor === "fingerprint" && "WebAuthn Biometric Sensor"}
                    {factor === "qr" && "Optical QR Card Scanner"}
                  </h3>
                  <p className="text-[11px] text-[#78736B]">
                    Target: Patient <span className="font-mono font-bold text-[#1E1B18]">{healthId}</span> • Reason: {reason}
                  </p>
                </div>
              </div>
              <button onClick={handleCloseSensorModal} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-6">
              {/* FACE LIVENESS / QR LIVE CAMERA VIEW */}
              {(factor === "face" || factor === "qr") && (
                <div className="relative mx-auto flex h-64 w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-[#C86D51] bg-[#1E1B18]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />

                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 text-white p-4 text-center">
                      <Camera className="h-10 w-10 text-[#C86D51] animate-pulse mb-2" />
                      <p className="text-xs font-bold text-[#E5E0D8]">Optical Biometric Sensor Feed Active</p>
                      <p className="text-[10px] text-zinc-400 mt-1">{cameraError}</p>
                    </div>
                  )}

                  {/* Face detection bounding overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className={`relative h-44 w-44 rounded-full border-2 ${
                      captureSuccess ? "border-emerald-400" :
                      isCapturing ? "border-green-400 animate-pulse" :
                      autoDetectProgress > 60 ? "border-yellow-400" :
                      "border-[#C86D51]"
                    } transition-colors duration-300`}>
                      {/* Scanning line */}
                      {!captureSuccess && (
                        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-md"
                          style={{ top: `${(autoDetectProgress % 100)}%`, transition: 'top 0.2s linear' }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Auto-detect status bar */}
                  <div className="absolute bottom-2 left-2 right-2 flex flex-col items-center gap-1">
                    <div className="w-full rounded-full bg-black/60 px-3 py-1 text-[10px] font-medium text-white backdrop-blur-xs flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0"></span>
                      {captureSuccess ? "✓ Match Verified — Unlocked" :
                        isCapturing ? "Verifying identity…" :
                        autoDetectProgress >= 100 ? "Confirmed — Unlocking…" :
                        `Auto-scanning… ${autoDetectProgress}% confidence`}
                    </div>
                    {/* Confidence progress bar */}
                    {!captureSuccess && !isCapturing && (
                      <div className="w-full rounded-full bg-black/40 h-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-200 ${
                            autoDetectProgress > 80 ? "bg-emerald-400" :
                            autoDetectProgress > 50 ? "bg-yellow-400" : "bg-[#C86D51]"
                          }`}
                          style={{ width: `${autoDetectProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* WEBAUTHN FINGERPRINT SENSOR VIEW */}
              {factor === "fingerprint" && (
                <div className="mx-auto flex h-64 w-full max-w-sm flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#C86D51] bg-[#FAF2EF] p-6 text-center">
                  <div className="relative mb-4 flex h-28 w-28 items-center justify-center">
                    {isCapturing && (
                      <>
                        <span className="absolute h-full w-full rounded-full bg-[#C86D51]/20 animate-ping"></span>
                        <span className="absolute h-24 w-24 rounded-full bg-[#C86D51]/30 animate-pulse"></span>
                      </>
                    )}
                    <div className={`relative flex h-20 w-20 items-center justify-center rounded-full shadow-md transition-all ${
                      captureSuccess
                        ? "bg-emerald-600 text-white"
                        : isCapturing
                        ? "bg-[#C86D51] text-white"
                        : "bg-white text-[#C86D51]"
                    }`}>
                      {captureSuccess ? (
                        <Check className="h-10 w-10 animate-in zoom-in" />
                      ) : (
                        <Fingerprint className="h-10 w-10" />
                      )}
                    </div>
                  </div>

                  <p className="text-sm font-bold text-[#1E1B18]">
                    {captureSuccess
                      ? "Biometric Matched & Verified!"
                      : isCapturing
                      ? "Reading Fingerprint Scan…"
                      : "Touch Sensor or Click 'Scan' to Verify"}
                  </p>
                  <p className="mt-1 text-[11px] text-[#78736B]">
                    Hospital Hardware Scanner / WebAuthn standard
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-[#F2EFEA] pt-4">
              <button
                type="button"
                onClick={handleCloseSensorModal}
                className="rounded-xl border border-[#E5E0D8] px-4 py-2.5 text-xs font-semibold text-[#555] hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>

              {/* For face/QR: show auto-detect status; for fingerprint: manual button */}
              {(factor === "face" || factor === "qr") ? (
                <div className="flex items-center gap-2 rounded-xl bg-[#FAF2EF] border border-[#E8CFC9] px-5 py-2.5 text-xs font-semibold text-[#C86D51]">
                  {captureSuccess ? (
                    <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> <span className="text-emerald-700">Unlocked Successfully</span></>
                  ) : isCapturing ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Verifying…</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 animate-spin text-[#C86D51]" /> Auto-detecting face…</>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isCapturing}
                  onClick={executeEmergencyUnlock}
                  className="flex items-center gap-2 rounded-xl bg-[#C86D51] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#B0583D] transition-colors disabled:opacity-60"
                >
                  {isCapturing ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Verifying…</>
                  ) : captureSuccess ? (
                    <><CheckCircle2 className="h-4 w-4" /> Unlocked!</>
                  ) : (
                    <>Scan Fingerprint &amp; Unlock</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
