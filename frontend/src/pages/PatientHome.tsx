import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setSession } from "../api";
import {
  LayoutDashboard,
  FolderKanban,
  ShieldCheck,
  Activity,
  Heart,
  TrendingUp,
  FileText,
  Clock,
  ShieldAlert,
  LogOut,
  ChevronRight,
  Sparkles,
  QrCode,
  Lock,
  Plus,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Shield,
  FileCheck,
  Stethoscope,
  Pill,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Calendar,
  Building,
  RefreshCw,
  Trash2,
  Eye,
  Check,
  ScanFace,
  Fingerprint,
  Camera,
  Bell,
  User,
  HelpCircle,
  Menu
} from "lucide-react";

export default function PatientHome() {
  const nav = useNavigate();
  const [me, setMe] = useState<any>(null);
  const [consents, setConsents] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "records" | "consents" | "audit" | "nutrition">("dashboard");
  const [err, setErr] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Consent Grant Modal State
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState(1);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["labs", "medications", "clinical_notes"]);
  const [durationDays, setDurationDays] = useState(7);
  const [granting, setGranting] = useState(false);

  // Record Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("labs");
  const [uploadText, setUploadText] = useState("Complete Blood Count (CBC)\nWBC: 6.2 x10^3/uL (Normal)\nRBC: 4.8 x10^6/uL\nHemoglobin: 14.2 g/dL\nPlatelets: 250 x10^3/uL\nNotes: Patient vitals stable, continue current regimen.");
  const [uploading, setUploading] = useState(false);

  // QR Modal State
  const [showQrModal, setShowQrModal] = useState(false);

  // Biometric Enrollment Modal State
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Biometric Enrollment State
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [bioFactor, setBioFactor] = useState<"face" | "fingerprint">("face");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);
  const [bioAutoProgress, setBioAutoProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bioTriggerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [p, c, t, n, r, h] = await Promise.all([
        api("/patient/me"),
        api("/patient/consents"),
        api("/timeline"),
        api("/patient/notifications"),
        api("/patient/records"),
        api("/patient/hospitals"),
      ]);
      setMe(p);
      setConsents(c);
      setTimeline(t);
      setNotifications(n);
      setRecords(r);
      setHospitals(h);
      if (h.length > 0) setSelectedHospitalId(h[0].id);

      if (p?.id) {
        try {
          setLoadingInsights(true);
          const ins = await api(`/records/patient/${p.id}/health-insights`);
          setInsights(ins);
        } catch (e: any) {
          console.warn("Patient insights load note:", e);
        } finally {
          setLoadingInsights(false);
        }
      }
    } catch (e: any) {
      setErr(e.message || "Failed to load patient data");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (bioTimerRef.current) clearInterval(bioTimerRef.current);
    if (bioTriggerRef.current) clearTimeout(bioTriggerRef.current);
    setBioAutoProgress(0);
  }

  function startBioAutoDetection() {
    setBioAutoProgress(0);
    let step = 0;
    bioTimerRef.current = setInterval(() => {
      step++;
      setBioAutoProgress(Math.min(step * 6, 100));
      if (step >= 17) {
        if (bioTimerRef.current) clearInterval(bioTimerRef.current);
      }
    }, 200);
    bioTriggerRef.current = setTimeout(() => {
      handleEnrollBiometric();
    }, 3400);
  }

  async function startCamera() {
    stopCamera();
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (e) {
      console.warn("Camera fallback:", e);
    }
    startBioAutoDetection();
  }

  function openBiometricModal(factor: "face" | "fingerprint") {
    setBioFactor(factor);
    setEnrollSuccess(null);
    setBioAutoProgress(0);
    setShowBiometricModal(true);
    if (factor === "face") {
      setTimeout(() => startCamera(), 300);
    } else {
      stopCamera();
    }
  }

  function closeBiometricModal() {
    stopCamera();
    setShowBiometricModal(false);
  }

  async function handleEnrollBiometric() {
    setEnrolling(true);
    setErr("");
    try {
      let sampleData = `LIVE-SAMPLE-${Date.now()}`;
      if (bioFactor === "face" && videoRef.current) {
        try {
          const video = videoRef.current;
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            sampleData = canvas.toDataURL("image/jpeg", 0.85);
          }
        } catch (e) {
          console.warn("Canvas snapshot fallback:", e);
        }
      }

      const res = await api("/patient/biometrics/enroll", {
        method: "POST",
        body: JSON.stringify({
          factor: bioFactor,
          sample_data: sampleData,
        }),
      });
      setEnrollSuccess(`✓ ${bioFactor.toUpperCase()} Biometric Key Enrolled: ${res.template_ref}`);
      await loadAll();
    } catch (e: any) {
      setErr(e.message || "Biometric enrollment failed");
    } finally {
      setEnrolling(false);
    }
  }

  async function handleGrantConsent() {
    setGranting(true);
    try {
      const exp = new Date();
      exp.setDate(exp.getDate() + durationDays);
      await api("/patient/consents", {
        method: "POST",
        body: JSON.stringify({
          hospital_id: selectedHospitalId,
          scope: selectedScopes,
          expires_at: exp.toISOString(),
        }),
      });
      setShowGrantModal(false);
      await loadAll();
    } catch (e: any) {
      setErr(e.message || "Failed to grant consent");
    } finally {
      setGranting(false);
    }
  }

  async function handleRevokeConsent(id: number) {
    try {
      await api(`/patient/consents/${id}/revoke`, { method: "POST" });
      await loadAll();
    } catch (e: any) {
      setErr(e.message || "Failed to revoke consent");
    }
  }

  async function handleUploadRecord() {
    setUploading(true);
    try {
      await api("/patient/records/upload", {
        method: "POST",
        body: JSON.stringify({
          category: uploadCategory,
          text: uploadText,
        }),
      });
      setShowUploadModal(false);
      await loadAll();
    } catch (e: any) {
      setErr(e.message || "Failed to upload record");
    } finally {
      setUploading(false);
    }
  }

  function handleLogout() {
    stopCamera();
    setSession(null);
    nav("/");
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 antialiased flex-col lg:flex-row">
      {/* MOBILE TOP NAVBAR */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-bold text-base text-gray-900 tracking-tight">HealLock</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
          aria-label="Toggle navigation menu"
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

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-100 shadow-xl lg:shadow-sm transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Shield className="h-4 w-4" />
            </div>
            <span className="font-bold text-base text-gray-900 tracking-tight">HealLock</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1 text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="relative flex-shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white font-bold text-sm shadow-sm">
              {me?.name ? me.name.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase() : "AS"}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{me?.name || "Ananya Sharma"}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-gray-500">Patient</span>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-100">Verified</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {/* Dashboard */}
          <button
            onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${ activeTab==="dashboard" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium" }`}>
            <LayoutDashboard className={`h-4 w-4 flex-shrink-0 ${ activeTab==="dashboard" ? "text-indigo-600" : "text-gray-400" }`} />
            Dashboard
          </button>

          {/* My Records */}
          <button
            onClick={() => { setActiveTab("records"); setMobileMenuOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${ activeTab==="records" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium" }`}>
            <FolderKanban className={`h-4 w-4 flex-shrink-0 ${ activeTab==="records" ? "text-indigo-600" : "text-gray-400" }`} />
            My Records
          </button>

          {/* My Consents */}
          <button
            onClick={() => { setActiveTab("consents"); setMobileMenuOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${ activeTab==="consents" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium" }`}>
            <ShieldCheck className={`h-4 w-4 flex-shrink-0 ${ activeTab==="consents" ? "text-indigo-600" : "text-gray-400" }`} />
            My Consents
          </button>

          {/* Access Timeline */}
          <button
            onClick={() => { setActiveTab("audit"); setMobileMenuOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${ activeTab==="audit" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium" }`}>
            <Clock className={`h-4 w-4 flex-shrink-0 ${ activeTab==="audit" ? "text-indigo-600" : "text-gray-400" }`} />
            Access Timeline
          </button>

          {/* AI Health Insights */}
          <button
            onClick={() => { setActiveTab("nutrition"); setMobileMenuOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${ activeTab==="nutrition" ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium" }`}>
            <Sparkles className={`h-4 w-4 flex-shrink-0 ${ activeTab==="nutrition" ? "text-indigo-600" : "text-gray-400" }`} />
            AI Health Insights
          </button>

          {/* Notifications with count badge */}
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
            <Bell className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span className="flex-1 text-left">Notifications</span>
            {notifications.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {notifications.length > 9 ? "9+" : notifications.length}
              </span>
            )}
          </button>

          {/* Emergency Access */}
          <button
            onClick={() => { openBiometricModal("face"); setMobileMenuOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-rose-50 hover:text-rose-700 transition-all group"
          >
            <ShieldAlert className="h-4 w-4 flex-shrink-0 text-rose-400 group-hover:text-rose-600" />
            Emergency Access
          </button>

          <div className="my-2 border-t border-gray-100" />

          {/* Profile Settings */}
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
            <User className="h-4 w-4 flex-shrink-0 text-gray-400" />
            Profile Settings
          </button>

          {/* Help & Support */}
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
            <HelpCircle className="h-4 w-4 flex-shrink-0 text-gray-400" />
            Help &amp; Support
          </button>
        </nav>

        {/* Bottom: Logout + Security Card */}
        <div className="px-3 pb-4 space-y-2 border-t border-gray-100 pt-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-all"
          >
            <LogOut className="h-4 w-4 flex-shrink-0 text-gray-400" />
            Logout
          </button>

          <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 flex items-start gap-2.5">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-900">Your data is secure</p>
              <p className="text-[10px] text-indigo-600 mt-0.5 leading-relaxed">All accesses are recorded on-chain.<br />You're in control.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-64 px-4 sm:px-6 lg:px-8 py-6 w-full max-w-7xl mx-auto">
        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-200 gap-4">
          <div>
            <h2 className="font-semibold text-xl sm:text-2xl tracking-tight text-gray-900">
              Good Morning, {me?.name?.split(" ")[0] || "Patient"} 👋
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
              Your health data is encrypted end-to-end. All access is recorded on-chain.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
            >
              <QrCode className="h-4 w-4 text-indigo-500" /> Emergency QR
            </button>

            <button
              onClick={() => openBiometricModal("face")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {me?.biometrics_registered ? "Biometrics Enrolled ✓" : "Enroll Biometrics"}
            </button>
          </div>
        </header>

        {err && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-[#C86D51] flex items-center justify-between">
            <span>{err}</span>
            <button onClick={() => setErr("")}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* TAB 1: MAIN DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="mt-6 space-y-6">
            {/* Top Row: Emergency Profile Banner & Smart Reminders */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Emergency Profile Card */}
              <div className="lg:col-span-2 rounded-3xl border border-[#E8CFC9] bg-[#FAF3F0] p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#EEDAD5] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#C86D51] text-white shadow-xs">
                      <Heart className="h-5 w-5 fill-white" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#1E1B18]">Emergency Medical Dossier</h3>
                      <p className="text-xs text-[#78736B]">Instant crisis parameters verified by first responders &amp; trauma ER.</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#E2ECE5] px-2.5 py-0.5 text-xs font-bold text-[#2D5A46]">
                    Single-Factor Ready
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                  <div className="rounded-2xl bg-white p-3.5 shadow-2xs border border-[#F2EFEA] text-center">
                    <p className="text-[10px] font-bold uppercase text-[#858077]">BLOOD GROUP</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-[#C86D51]">{me?.emergency_profile?.blood_group || "O+"}</p>
                  </div>

                  <div className="rounded-2xl bg-white p-3.5 shadow-2xs border border-[#F2EFEA]">
                    <p className="text-[10px] font-bold uppercase text-[#858077]">ALLERGIES</p>
                    <p className="mt-1 text-xs font-bold text-[#C86D51]">
                      {me?.emergency_profile?.allergies?.join(", ") || "None Reported"}
                    </p>
                    <span className="text-[9px] text-rose-700 font-semibold uppercase">
                      {me?.emergency_profile?.allergies?.length ? "Allergy Alert" : "No Known Allergies"}
                    </span>
                  </div>

                  <div className="rounded-2xl bg-white p-3.5 shadow-2xs border border-[#F2EFEA]">
                    <p className="text-[10px] font-bold uppercase text-[#858077]">CRITICAL MEDS</p>
                    <p className="mt-1 text-xs font-bold text-[#1E1B18]">
                      {me?.emergency_profile?.critical_meds?.join(", ") || "None Reported"}
                    </p>
                    <span className="text-[9px] text-[#78736B]">Active Regimen</span>
                  </div>

                  <div className="rounded-2xl bg-white p-3.5 shadow-2xs border border-[#F2EFEA]">
                    <p className="text-[10px] font-bold uppercase text-[#858077]">CONDITIONS</p>
                    <p className="mt-1 text-xs font-bold text-[#1E1B18]">
                      {me?.emergency_profile?.critical_conditions?.join(", ") || "General Registered Patient"}
                    </p>
                    <span className="text-[9px] text-[#78736B]">Clinical Status</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white/70 px-4 py-2.5 text-xs text-[#78736B] border border-[#EEDAD5]">
                  <span>
                    Next of Kin: <b className="text-[#1E1B18]">{me?.emergency_profile?.emergency_contacts?.[0]?.name || `${me?.name || "Registered User"} (Primary Contact)`}</b> • {me?.emergency_profile?.emergency_contacts?.[0]?.phone || "+91-90000-00000"}
                  </span>
                  <div className="flex gap-3">
                    <button onClick={() => openBiometricModal("face")} className="font-semibold text-[#4A8B6E] hover:underline">
                      📸 Register Face ID
                    </button>
                    <button onClick={() => setShowQrModal(true)} className="font-semibold text-[#C86D51] hover:underline">
                      View QR Token →
                    </button>
                  </div>
                </div>
              </div>

              {/* Smart Reminders */}
              <div className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#9E7230]" />
                  <h3 className="font-serif text-lg font-bold text-[#1E1B18]">Smart Reminders</h3>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-[#F2EFEA] bg-[#FAF7F2] p-3.5">
                    <p className="text-xs font-bold text-[#1E1B18]">INR / Coagulation Lab</p>
                    <p className="text-[11px] text-[#78736B] mt-0.5">Due in 3 days for Warfarin therapeutic range tracking.</p>
                  </div>

                  <div className="rounded-2xl border border-[#F2EFEA] bg-[#FAF7F2] p-3.5">
                    <p className="text-xs font-bold text-[#1E1B18]">Cardiology Follow-Up</p>
                    <p className="text-[11px] text-[#78736B] mt-0.5">Scheduled with Dr. Shah on Aug 28, 2026.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row: Active Consent Grants & Recent Timeline */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Active Consent Grants Card */}
              <div className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-[#F2EFEA]">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#1E1B18]">Active Consent Grants</h3>
                    <p className="text-xs text-[#78736B]">Granular hospital authorizations. Revocable anytime.</p>
                  </div>
                  <button
                    onClick={() => setShowGrantModal(true)}
                    className="rounded-xl bg-[#FAF2EF] border border-[#E8CFC9] px-3 py-1.5 text-xs font-bold text-[#C86D51] hover:bg-[#F5E4E0]"
                  >
                    + New Grant
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {consents.length === 0 && (
                    <p className="text-xs text-[#858077] py-4 text-center">No active consents found.</p>
                  )}
                  {consents.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-[#E5E0D8] bg-[#FAF7F2] p-4 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-[#EAE5DF]">
                        <div>
                          <p className="font-bold text-[#1E1B18] text-sm">{c.hospital_name || "St. Mary's General Hospital"}</p>
                          <p className="text-[11px] text-[#78736B]">Expires: {new Date(c.expires_at).toLocaleDateString()}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                            c.status === "active"
                              ? "bg-[#E2ECE5] text-[#2D5A46]"
                              : c.status === "revoked"
                              ? "bg-[#FAF2EF] text-[#C86D51]"
                              : "bg-[#FAF6EE] text-[#9E7230]"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {c.scope?.map((s: string) => (
                            <span key={s} className="rounded-md bg-white border border-[#E5E0D8] px-2 py-0.5 text-[10px] text-[#666159]">
                              {s}
                            </span>
                          ))}
                        </div>

                        {c.status === "active" && (
                          <button
                            onClick={() => handleRevokeConsent(c.id)}
                            className="rounded-lg border border-[#C86D51] bg-white px-2.5 py-1 text-[11px] font-bold text-[#C86D51] hover:bg-[#FAF2EF]"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Access Timeline */}
              <div className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-[#F2EFEA]">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#1E1B18]">Recent Access Timeline</h3>
                    <p className="text-xs text-[#78736B]">Provable cryptographic logs of every clinical query.</p>
                  </div>
                  <span className="rounded-full bg-[#E2ECE5] px-2.5 py-0.5 text-xs font-bold text-[#2D5A46]">
                    On-Chain Verified ✓
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {timeline.slice(0, 4).map((t, idx) => (
                    <div key={idx} className="rounded-2xl border border-[#F2EFEA] bg-[#FAF7F2] p-3.5 text-xs">
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-bold text-[#1E1B18]">{t.reason || t.category || "Clinical Consultation"}</span>
                        <span className="text-[10px] text-[#858077]">{new Date(t.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[11px] text-[#78736B]">
                        Hospital #{t.hospital_id} • Staff #{t.staff_id} • Type: <b className="uppercase">{t.access_type}</b>
                      </p>
                      <p className="mt-1.5 font-mono text-[9px] text-[#4A8B6E] truncate">Tx: {t.tx_hash}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HEALTH RECORDS & DOCUMENT AI */}
        {activeTab === "records" && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1E1B18]">Your Encrypted Medical Records</h3>
                <p className="text-xs text-[#78736B]">Stored with client-side AES-GCM encryption. Structured with Document AI.</p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="rounded-xl bg-[#C86D51] px-4 py-2 text-xs font-bold text-white hover:bg-[#B0583D] flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Add Record / OCR
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {records.map((r) => (
                <div key={r.id} className="rounded-3xl border border-[#E5E0D8] bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-[#F2EFEA] pb-2.5">
                    <span className="rounded-full bg-[#FAF2EF] border border-[#E8CFC9] px-2.5 py-0.5 text-xs font-bold text-[#C86D51] uppercase">
                      {r.category}
                    </span>
                    <span className="text-[11px] text-[#858077]">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="rounded-xl bg-[#FAF7F2] p-3 text-xs">
                    <pre className="whitespace-pre-wrap font-sans text-[#2B2825] leading-relaxed">{r.content}</pre>
                  </div>

                  {r.ai_extracted_fields && Object.keys(r.ai_extracted_fields).length > 0 && (
                    <div className="rounded-xl bg-[#F0F6F2] p-3 text-xs text-[#2D5A46]">
                      <p className="font-bold flex items-center gap-1 mb-1">
                        <Sparkles className="h-3.5 w-3.5 text-[#4A8B6E]" /> AI Extracted Parameters:
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {r.ai_extracted_fields.medications && (
                          <span>Meds: <b>{r.ai_extracted_fields.medications.join(", ")}</b></span>
                        )}
                        {r.ai_extracted_fields.inr && (
                          <span>INR: <b>{r.ai_extracted_fields.inr}</b></span>
                        )}
                        {r.ai_extracted_fields.bp && (
                          <span>BP: <b>{r.ai_extracted_fields.bp}</b></span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2B: AI NUTRITION & DIETARY PROTOCOL */}
        {activeTab === "nutrition" && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1E1B18]">AI Personalized Nutrition &amp; Care Protocol</h3>
                <p className="text-xs text-[#78736B]">
                  Tailored nutrition, drug-nutrient interaction safety, and lifestyle guidelines synthesized from your active prescriptions and lab values.
                </p>
              </div>
              {insights?.ai_engine && (
                <span className="rounded-full bg-[#E2ECE5] px-3.5 py-1 text-xs font-bold text-[#2D5A46]">
                  {insights.ai_engine}
                </span>
              )}
            </div>

            {loadingInsights && (
              <div className="rounded-3xl border border-[#E5E0D8] bg-white p-8 text-center text-xs text-[#78736B]">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#C86D51]" />
                Scanning your prescriptions, lab history, and allergies to generate personalized dietary rules…
              </div>
            )}

            {insights && (
              <div className="space-y-6">
                {/* Clinical Summary */}
                <div className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#858077] mb-1">CLINICAL HEALTH SUMMARY</p>
                  <p className="text-sm leading-relaxed text-[#1E1B18] font-medium">{insights.clinical_summary}</p>
                </div>

                {/* 2-Column Dietary Protocol vs Foods to Avoid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dietary Recommendations */}
                  <div className="rounded-3xl border border-[#CDE5D8] bg-[#F2F8F4] p-6 space-y-3">
                    <h4 className="font-serif text-base font-bold text-[#2D5A46] flex items-center gap-2">
                      🥗 Recommended Dietary Protocol
                    </h4>
                    <ul className="space-y-2.5 text-xs text-[#234E3B]">
                      {insights.dietary_recommendations?.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#2D5A46] font-bold mt-0.5">•</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Contraindicated Foods */}
                  <div className="rounded-3xl border border-[#F5D2CB] bg-[#FAF1EE] p-6 space-y-3">
                    <h4 className="font-serif text-base font-bold text-[#C86D51] flex items-center gap-2">
                      🚫 Foods &amp; Nutrients to Avoid / Restrict
                    </h4>
                    <ul className="space-y-2.5 text-xs text-[#943F25]">
                      {insights.foods_to_avoid?.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#C86D51] font-bold mt-0.5">•</span>
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Lifestyle Guidelines & Lab Followups */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-3">
                    <h4 className="font-serif text-sm font-bold text-[#1E1B18] uppercase tracking-wide">
                      🏃 Lifestyle &amp; Activity Guidelines
                    </h4>
                    <ul className="space-y-2 text-xs text-[#666159]">
                      {insights.lifestyle_guidelines?.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#2D5A46] font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-3">
                    <h4 className="font-serif text-sm font-bold text-[#1E1B18] uppercase tracking-wide">
                      📅 Scheduled Lab Follow-ups
                    </h4>
                    <ul className="space-y-2 text-xs text-[#666159]">
                      {insights.recommended_follow_ups?.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#9E7230] font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CONSENT GRANTS */}
        {activeTab === "consents" && (
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1E1B18]">Consent Control Management</h3>
                <p className="text-xs text-[#78736B]">Manage granular department permissions, access durations, and instant revocation.</p>
              </div>
              <button
                onClick={() => setShowGrantModal(true)}
                className="rounded-xl bg-[#4A8B6E] px-4 py-2 text-xs font-bold text-white hover:bg-[#3d725a] flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Grant New Consent
              </button>
            </div>

            <div className="space-y-4">
              {consents.map((c) => (
                <div key={c.id} className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F2EFEA] pb-4">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-[#1E1B18]">{c.hospital_name || "St. Mary's General"}</h4>
                      <p className="text-xs text-[#78736B]">Hospital ID #{c.hospital_id} • Expires: {new Date(c.expires_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-[#E2ECE5] px-3 py-1 text-xs font-bold text-[#2D5A46] uppercase">
                        {c.status}
                      </span>
                      {c.status === "active" && (
                        <button
                          onClick={() => handleRevokeConsent(c.id)}
                          className="rounded-xl bg-[#FAF2EF] border border-[#E8CFC9] px-3.5 py-1.5 text-xs font-bold text-[#C86D51] hover:bg-[#F5E4E0]"
                        >
                          Revoke Access
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[#858077] font-semibold">Authorized Scopes:</span>
                      {c.scope?.map((s: string) => (
                        <span key={s} className="rounded-md bg-[#FAF7F2] border border-[#E5E0D8] px-2.5 py-1 text-[11px] text-[#1E1B18] font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-[10px] text-[#4A8B6E]">Tx: {c.tx_hash}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: ACCESS TIMELINE */}
        {activeTab === "audit" && (
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#1E1B18]">Immutable Audit Trail</h3>
              <p className="text-xs text-[#78736B]">Cryptographic record of every health access event recorded on-chain.</p>
            </div>

            <div className="space-y-3">
              {timeline.map((t, i) => (
                <div key={i} className="rounded-2xl border border-[#E5E0D8] bg-white p-4 text-xs shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F2EFEA]">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${t.access_type === "emergency" ? "bg-[#C86D51]" : "bg-[#4A8B6E]"}`} />
                      <p className="font-bold text-[#1E1B18] uppercase tracking-wide">{t.access_type} Access</p>
                    </div>
                    <span className="text-[11px] text-[#858077]">{new Date(t.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 md:grid-cols-3 gap-2 text-[#78736B]">
                    <p>Hospital ID: <b className="text-[#1E1B18]">#{t.hospital_id}</b></p>
                    <p>Staff ID: <b className="text-[#1E1B18]">#{t.staff_id}</b></p>
                    <p>Factor / Scope: <b className="text-[#1E1B18]">{t.factor_used || t.reason || "Standard Scope"}</b></p>
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-[#4A8B6E] truncate">Ledger Block Tx: {t.tx_hash}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: GRANT CONSENT */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-[#E5E0D8]">
            <div className="flex items-center justify-between pb-4 border-b border-[#F2EFEA]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E2ECE5] text-[#2D5A46]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1E1B18]">Grant Hospital Access</h3>
                  <p className="text-[11px] text-[#78736B]">Scoped, time-limited cryptographic permission.</p>
                </div>
              </div>
              <button onClick={() => setShowGrantModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>

            <div className="my-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#858077] mb-1">SELECT HOSPITAL</label>
                <select
                  className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAF7F2] p-2.5 text-xs text-[#1E1B18]"
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(Number(e.target.value))}
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#858077] mb-1.5">DATA SCOPES TO SHARE</label>
                <div className="grid grid-cols-2 gap-2">
                  {["labs", "medications", "clinical_notes", "scans"].map((scope) => {
                    const active = selectedScopes.includes(scope);
                    return (
                      <button
                        key={scope}
                        type="button"
                        onClick={() => {
                          setSelectedScopes((prev) =>
                            active ? prev.filter((s) => s !== scope) : [...prev, scope]
                          );
                        }}
                        className={`flex items-center justify-between rounded-xl border p-2.5 transition-all ${
                          active
                            ? "border-[#4A8B6E] bg-[#E2ECE5]/40 text-[#2D5A46] font-bold"
                            : "border-[#E5E0D8] bg-white text-[#666159]"
                        }`}
                      >
                        <span className="capitalize">{scope.replace("_", " ")}</span>
                        {active && <Check className="h-4 w-4 text-[#2D5A46]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#858077] mb-1">VALIDITY DURATION (DAYS)</label>
                <div className="flex gap-2">
                  {[1, 7, 30, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDurationDays(d)}
                      className={`flex-1 rounded-xl border py-2 font-bold transition-all ${
                        durationDays === d
                          ? "border-[#C86D51] bg-[#FAF2EF] text-[#C86D51]"
                          : "border-[#E5E0D8] bg-white text-[#666159]"
                      }`}
                    >
                      {d === 1 ? "24 Hours" : `${d} Days`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#F2EFEA] pt-4">
              <button
                type="button"
                onClick={() => setShowGrantModal(false)}
                className="rounded-xl border border-[#E5E0D8] px-4 py-2 text-xs font-semibold text-[#555]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={granting}
                onClick={handleGrantConsent}
                className="flex items-center gap-2 rounded-xl bg-[#4A8B6E] px-6 py-2 text-xs font-bold text-white hover:bg-[#3d725a]"
              >
                {granting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Sign & Authorize On-Chain"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD & OCR RECORD */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-[#E5E0D8]">
            <div className="flex items-center justify-between pb-4 border-b border-[#F2EFEA]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF2EF] text-[#C86D51]">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1E1B18]">Upload / Parse Medical Record</h3>
                  <p className="text-[11px] text-[#78736B]">Document AI structured extraction &amp; AES-GCM encryption.</p>
                </div>
              </div>
              <button onClick={() => setShowUploadModal(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>

            <div className="my-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#858077] mb-1">RECORD CATEGORY</label>
                <select
                  className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAF7F2] p-2.5 text-xs text-[#1E1B18]"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                >
                  <option value="labs">Laboratory Report (CBC, Lipid, Metabolic)</option>
                  <option value="medications">Medication Prescription</option>
                  <option value="clinical_notes">Physician Clinical Notes</option>
                  <option value="scans">Radiology &amp; Imaging Summary</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#858077] mb-1">CLINICAL DOCUMENT TEXT / OCR FEED</label>
                <textarea
                  rows={5}
                  className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAF7F2] p-3 text-xs text-[#1E1B18] font-mono leading-relaxed"
                  value={uploadText}
                  onChange={(e) => setUploadText(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#F2EFEA] pt-4">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded-xl border border-[#E5E0D8] px-4 py-2 text-xs font-semibold text-[#555]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={handleUploadRecord}
                className="flex items-center gap-2 rounded-xl bg-[#C86D51] px-6 py-2 text-xs font-bold text-white hover:bg-[#B0583D]"
              >
                {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Extract & Encrypt Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BIOMETRIC ENROLLMENT STUDIO */}
      {showBiometricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#E5E0D8]">
            <div className="flex items-center justify-between pb-4 border-b border-[#F2EFEA]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E2ECE5] text-[#2D5A46]">
                  {bioFactor === "face" ? <ScanFace className="h-4 w-4" /> : <Fingerprint className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1E1B18]">Biometric Enrollment Studio</h3>
                  <p className="text-[11px] text-[#78736B]">One-way cryptographic template generation.</p>
                </div>
              </div>
              <button onClick={closeBiometricModal}><X className="h-5 w-5 text-gray-400" /></button>
            </div>

            <div className="my-5 space-y-4">
              {/* Factor switch */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBioFactor("face");
                    setEnrollSuccess(null);
                    setBioAutoProgress(0);
                    setTimeout(() => startCamera(), 200);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    bioFactor === "face"
                      ? "border-[#4A8B6E] bg-[#E2ECE5]/40 text-[#2D5A46]"
                      : "border-[#E5E0D8] bg-white text-[#666159]"
                  }`}
                >
                  <ScanFace className="h-4 w-4" /> Face Liveness
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBioFactor("fingerprint");
                    stopCamera();
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                    bioFactor === "fingerprint"
                      ? "border-[#4A8B6E] bg-[#E2ECE5]/40 text-[#2D5A46]"
                      : "border-[#E5E0D8] bg-white text-[#666159]"
                  }`}
                >
                  <Fingerprint className="h-4 w-4" /> Touch Fingerprint
                </button>
              </div>

              {/* Live Viewfinder */}
              <div className="relative mx-auto flex h-60 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-[#4A8B6E] bg-[#1E1B18]">
                {bioFactor === "face" ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className={`h-36 w-36 rounded-full border-2 transition-colors duration-300 ${
                        enrollSuccess ? "border-emerald-400" :
                        enrolling ? "border-emerald-400 animate-pulse" :
                        bioAutoProgress > 60 ? "border-yellow-400" : "border-[#4A8B6E] border-dashed animate-pulse"
                      }`}>
                        {/* Scanning line */}
                        {!enrollSuccess && (
                          <div
                            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-md"
                            style={{ top: `${bioAutoProgress % 100}%`, transition: 'top 0.2s linear' }}
                          />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-white">
                    <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[#4A8B6E] text-white shadow-lg">
                      <Fingerprint className="h-9 w-9" />
                    </div>
                    <p className="text-xs font-bold">Touch Sensor Ready</p>
                  </div>
                )}

                {/* Status bar inside viewfinder */}
                <div className="absolute bottom-2 left-2 right-2 flex flex-col items-center gap-1">
                  <div className="w-full rounded-full bg-black/60 px-3 py-1 text-[10px] text-white flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0"></span>
                    {enrollSuccess ? "✓ Template Enrolled" :
                      enrolling ? "Processing vector encoding…" :
                      bioFactor === "face" ? `Auto-scanning… ${bioAutoProgress}% confidence` :
                      "Zero raw images stored • Encrypted vector template only"}
                  </div>
                  {bioFactor === "face" && !enrollSuccess && !enrolling && (
                    <div className="w-full rounded-full bg-black/40 h-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-200 ${
                          bioAutoProgress > 80 ? "bg-emerald-400" :
                          bioAutoProgress > 50 ? "bg-yellow-400" : "bg-[#4A8B6E]"
                        }`}
                        style={{ width: `${bioAutoProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {enrollSuccess && (
                <div className="rounded-xl bg-[#F0F6F2] p-3 text-xs font-bold text-[#2D5A46] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> {enrollSuccess}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#F2EFEA] pt-4">
              <button
                type="button"
                onClick={closeBiometricModal}
                className="rounded-xl border border-[#E5E0D8] px-4 py-2 text-xs font-semibold text-[#555]"
              >
                Close
              </button>

              {bioFactor === "face" ? (
                <div className="flex items-center gap-2 rounded-xl bg-[#F0F6F2] border border-[#CDE5D8] px-5 py-2 text-xs font-semibold text-[#2D5A46]">
                  {enrollSuccess ? (
                    <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Enrolled Successfully</>
                  ) : enrolling ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Encoding template…</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 animate-spin text-[#4A8B6E]" /> Auto-detecting face…</>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={enrolling}
                  onClick={handleEnrollBiometric}
                  className="flex items-center gap-2 rounded-xl bg-[#4A8B6E] px-6 py-2 text-xs font-bold text-white hover:bg-[#3d725a] disabled:opacity-60"
                >
                  {enrolling ? <RefreshCw className="h-4 w-4 animate-spin" /> : "🖐 Scan & Enroll Fingerprint"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EMERGENCY QR BADGE */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#E5E0D8] text-center">
            <div className="flex justify-between items-center pb-3 border-b border-[#F2EFEA]">
              <h3 className="font-serif text-base font-bold text-[#1E1B18]">Emergency QR Card</h3>
              <button onClick={() => setShowQrModal(false)}><X className="h-4 w-4 text-gray-400" /></button>
            </div>

            <div className="my-6 flex flex-col items-center">
              <div className="rounded-2xl border-4 border-[#C86D51] p-4 bg-white shadow-inner mb-3">
                <QrCode className="h-40 w-40 text-[#1E1B18]" />
              </div>
              <p className="font-mono text-xs font-bold text-[#C86D51]">{me?.qr_token || "QR-ASHA-EMERGENCY"}</p>
              <p className="text-[11px] text-[#78736B] mt-1">Scan from any first responder phone or hospital trauma kiosk.</p>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full rounded-xl bg-[#1E1B18] py-2.5 text-xs font-bold text-white hover:bg-black"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
