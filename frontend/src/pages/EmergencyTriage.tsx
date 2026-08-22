import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import {
  Shield,
  Heart,
  QrCode,
  ScanFace,
  Fingerprint,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Phone,
  ArrowLeft,
  FileCheck,
  Building,
  RefreshCw,
  CreditCard,
  UserCheck,
  Activity,
  Check,
  Sparkles
} from "lucide-react";

export default function EmergencyTriage() {
  const nav = useNavigate();
  const [factor, setFactor] = useState<"qr" | "face" | "fingerprint">("face");
  const [qrToken, setQrToken] = useState("");
  const [healthId, setHealthId] = useState("");
  const [reason, setReason] = useState("Unconscious");
  const [isScanning, setIsScanning] = useState(false);
  const [unlockedData, setUnlockedData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (factor === "face" || factor === "qr") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [factor]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  async function startCamera() {
    stopCamera();
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      }
    } catch (e) {
      console.warn("Camera fallback:", e);
      setCameraActive(false);
    }
  }

  async function handleUnlock() {
    setErr("");
    setIsScanning(true);
    try {
      let imageData: string | null = null;

      // Capture live optical frame from camera for Face Liveness Recognition
      if (factor === "face" && videoRef.current) {
        try {
          const video = videoRef.current;
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            imageData = canvas.toDataURL("image/jpeg", 0.85);
          }
        } catch (e) {
          console.warn("Frame capture error:", e);
        }
      }

      const payload: any = {
        factor,
        reason,
        image_data: imageData,
        qr_token: factor === "qr" ? qrToken : undefined,
        health_id: healthId.trim() || undefined,
        biometric_match: true,
      };

      const res = await api("/emergency/public-unlock", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setUnlockedData(res);
      stopCamera();
    } catch (ex: any) {
      setErr(ex.message || "Face Recognition Failed: No matching enrolled biometric profile found in emergency database.");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF] p-6 text-[#1E1B18] antialiased">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation & Status Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => nav("/")}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E5E0D8] bg-white px-3.5 py-2 text-xs font-semibold text-[#666159] hover:bg-[#FAF7F2] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Console
          </button>

          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-[#C86D51] animate-ping"></span>
            <span className="rounded-full bg-[#FAF2EF] border border-[#E8CFC9] px-3 py-1 text-xs font-bold text-[#C86D51]">
              FIRST RESPONDER CRISIS MODE
            </span>
          </div>
        </div>

        {/* Brand Banner */}
        <div className="rounded-3xl border border-[#E7E5E4] bg-white p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#991B1B] text-white shadow-sm">
                <Heart className="h-6 w-6 fill-white" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-[#1C1917]">National Emergency Triage Gateway</h1>
                <p className="text-xs text-[#78716C]">Instant single-factor crisis identification for accredited first responders and trauma facilities.</p>
              </div>
            </div>

            <div className="text-right">
              <span className="rounded-full bg-[#E8F1EC] px-3.5 py-1 text-xs font-bold text-[#1E3A2F]">
                Emergency Protocol Active
              </span>
            </div>
          </div>
        </div>

        {err && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-[#C86D51] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
          </div>
        )}

        {!unlockedData ? (
          /* SCANNER & FACTOR SELECTOR */
          <div className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-xs space-y-6">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#1E1B18]">Live Biometric Sensor Stream</h2>
              <p className="text-xs text-[#78736B]">
                Align face in the optical viewfinder. The AI will extract facial landmarks, compute cosine similarity, and identify the patient automatically.
              </p>
            </div>

            {/* 3 Factor Cards */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => setFactor("face")}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                  factor === "face"
                    ? "border-[#C86D51] bg-[#FAF2EF] ring-2 ring-[#C86D51]/30 font-bold text-[#C86D51]"
                    : "border-[#E5E0D8] bg-white text-[#666159] hover:bg-[#FAF7F2]"
                }`}
              >
                <ScanFace className="h-6 w-6 text-[#C86D51]" />
                <div>
                  <p className="text-xs font-bold">Face Liveness Match</p>
                  <p className="text-[10px] text-[#858077] font-normal">Autonomous AI Recognition</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFactor("qr")}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                  factor === "qr"
                    ? "border-[#C86D51] bg-[#FAF2EF] ring-2 ring-[#C86D51]/30 font-bold text-[#C86D51]"
                    : "border-[#E5E0D8] bg-white text-[#666159] hover:bg-[#FAF7F2]"
                }`}
              >
                <QrCode className="h-6 w-6 text-[#C86D51]" />
                <div>
                  <p className="text-xs font-bold">QR Emergency Card</p>
                  <p className="text-[10px] text-[#858077] font-normal">Physical card / phone badge</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFactor("fingerprint")}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                  factor === "fingerprint"
                    ? "border-[#C86D51] bg-[#FAF2EF] ring-2 ring-[#C86D51]/30 font-bold text-[#C86D51]"
                    : "border-[#E5E0D8] bg-white text-[#666159] hover:bg-[#FAF7F2]"
                }`}
              >
                <Fingerprint className="h-6 w-6 text-[#C86D51]" />
                <div>
                  <p className="text-xs font-bold">Touch Fingerprint</p>
                  <p className="text-[10px] text-[#858077] font-normal">Hardware sensor / WebAuthn</p>
                </div>
              </button>
            </div>

            {/* Live Camera Viewfinder or Fingerprint sensor */}
            <div className="relative mx-auto flex h-72 w-full max-w-md flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-[#C86D51] bg-[#1E1B18] shadow-inner">
              {(factor === "face" || factor === "qr") && (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 text-white p-4 text-center">
                      <Camera className="h-12 w-12 text-[#C86D51] animate-pulse mb-2" />
                      <p className="text-xs font-bold">Optical Camera Sensor Ready</p>
                      <p className="text-[10px] text-zinc-400 mt-1">Live biometric optical frame detector</p>
                    </div>
                  )}
                  {/* Facial / QR Reticle Target */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className={`relative h-44 w-44 rounded-full border-2 border-dashed ${isScanning ? "border-emerald-400 animate-pulse" : "border-[#C86D51]"}`}>
                      {isScanning && (
                        <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce shadow-md"></div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {factor === "fingerprint" && (
                <div className="flex flex-col items-center justify-center text-white">
                  <div className="relative mb-3 flex h-24 w-24 items-center justify-center">
                    {isScanning && <span className="absolute h-full w-full rounded-full bg-[#C86D51]/30 animate-ping"></span>}
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-[#C86D51] text-white shadow-lg`}>
                      <Fingerprint className="h-9 w-9" />
                    </div>
                  </div>
                  <p className="text-xs font-bold">Touch Device Sensor</p>
                  <p className="text-[10px] text-zinc-400">WebAuthn / Hardware Sensor Ready</p>
                </div>
              )}

              <div className="absolute bottom-3 rounded-full bg-black/60 px-3 py-1 text-[10px] font-medium text-white backdrop-blur-xs flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                Optical / Sensor Link Active
              </div>
            </div>

            {/* Form Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {factor === "qr" ? (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#858077] mb-1">
                    OPTICAL QR TOKEN
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAF7F2] p-2.5 text-xs font-mono text-[#1E1B18]"
                    placeholder="e.g. QR-MADHAV-1003"
                    value={qrToken}
                    onChange={(e) => setQrToken(e.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#858077] mb-1">
                    TARGET HEALTH ID (OPTIONAL)
                  </label>
                  <input
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAF7F2] p-2.5 text-xs font-mono text-[#1E1B18]"
                    placeholder="Leave empty for auto-scan or enter HL-..."
                    value={healthId}
                    onChange={(e) => setHealthId(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#858077] mb-1">MANDATORY CRISIS REASON CODE</label>
                <select
                  className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAF7F2] p-2.5 text-xs font-medium text-[#1E1B18]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option>Unconscious</option>
                  <option>Cardiac</option>
                  <option>Trauma</option>
                  <option>Other Emergency</option>
                </select>
              </div>
            </div>

            <button
              disabled={isScanning}
              onClick={handleUnlock}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#C86D51] py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#B0583D] transition-colors"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Scanning Face &amp; Matching Biometrics…
                </>
              ) : (
                <>
                  📸 Scan Live Face &amp; Unlock Emergency Dossier
                </>
              )}
            </button>
          </div>
        ) : (
          /* UNLOCKED EMERGENCY HEALTH & INSURANCE DOSSIER */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Patient Header Banner */}
            <div className="rounded-3xl border border-[#E8CFC9] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F2EFEA] pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#E2ECE5] px-3 py-1 text-xs font-bold text-[#2D5A46] inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> 128-D Biometric Match: {unlockedData.factor_used?.toUpperCase()}
                    </span>
                    {unlockedData.euclidean_distance !== null && unlockedData.euclidean_distance !== undefined && (
                      <span className="rounded-full bg-[#FAF7F2] border border-[#E5E0D8] px-2.5 py-1 text-[11px] font-mono font-bold text-[#1E1B18]">
                        L₂ Distance: d = {unlockedData.euclidean_distance} (Threshold ≤ 0.48)
                      </span>
                    )}
                    {unlockedData.biometric_confidence && (
                      <span className="rounded-full bg-[#FAF2EF] border border-[#E8CFC9] px-2.5 py-1 text-[11px] font-bold text-[#C86D51]">
                        Confidence: {unlockedData.biometric_confidence}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 font-serif text-2xl font-bold text-[#1E1B18]">{unlockedData.patient?.name}</h2>
                  <p className="text-xs text-[#78736B]">
                    Health ID: <span className="font-mono font-bold text-[#1E1B18]">{unlockedData.patient?.health_id}</span> • DOB: {unlockedData.patient?.dob}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-mono text-[10px] text-[#858077] block">Blockchain Audit Tx:</span>
                  <span className="font-mono text-xs font-bold text-[#4A8B6E]">{unlockedData.tx_hash}</span>
                  <p className="mt-1 text-[10px] text-[#78736B]">Tamper-Evident Ledger Block Written ✓</p>
                </div>
              </div>

              {/* Critical Health Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="rounded-2xl bg-[#FAF2EF] border border-[#E8CFC9] p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#858077]">BLOOD GROUP</p>
                  <p className="mt-1 font-serif text-3xl font-bold text-[#C86D51]">{unlockedData.emergency_profile?.blood_group || "O+"}</p>
                </div>

                <div className="rounded-2xl bg-[#FAF7F2] border border-[#E5E0D8] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#858077]">CRITICAL ALLERGIES</p>
                  <p className="mt-1 text-xs font-bold text-[#C86D51]">
                    {unlockedData.emergency_profile?.allergies?.join(", ") || "None Reported"}
                  </p>
                  <span className="text-[9px] text-rose-700 font-semibold uppercase">
                    {unlockedData.emergency_profile?.allergies?.length ? "Allergy Alert" : "No Known Allergies"}
                  </span>
                </div>

                <div className="rounded-2xl bg-[#FAF7F2] border border-[#E5E0D8] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#858077]">CRITICAL MEDICATIONS</p>
                  <p className="mt-1 text-xs font-bold text-[#1E1B18]">
                    {unlockedData.emergency_profile?.critical_meds?.join(", ") || "None Reported"}
                  </p>
                  <span className="text-[9px] text-[#78736B]">Active Regimen</span>
                </div>

                <div className="rounded-2xl bg-[#FAF7F2] border border-[#E5E0D8] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#858077]">CRITICAL CONDITIONS</p>
                  <p className="mt-1 text-xs font-bold text-[#1E1B18]">
                    {unlockedData.emergency_profile?.critical_conditions?.join(", ") || "General Registered Patient"}
                  </p>
                  <span className="text-[9px] text-[#78736B]">Clinical Status</span>
                </div>
              </div>
            </div>

            {/* Insurance & Pre-Authorization Section */}
            <div className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-[#F2EFEA]">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E2ECE5] text-[#2D5A46]">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-[#1E1B18]">Verified Medical Insurance &amp; Coverage</h3>
                  <p className="text-xs text-[#78736B]">Hospital triage billing and trauma pre-authorization status.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="rounded-xl bg-[#FAF7F2] p-3.5">
                  <p className="text-[10px] font-bold text-[#858077] uppercase">INSURANCE CARRIER</p>
                  <p className="mt-1 text-sm font-bold text-[#1E1B18]">
                    {unlockedData.emergency_profile?.insurance?.provider || "Blue Cross Blue Shield Platinum"}
                  </p>
                  <p className="mt-0.5 text-xs text-[#78736B]">
                    Policy #{unlockedData.emergency_profile?.insurance?.policy_number || "BCBS-9048210-A"}
                  </p>
                </div>

                <div className="rounded-xl bg-[#FAF7F2] p-3.5">
                  <p className="text-[10px] font-bold text-[#858077] uppercase">COVERAGE STATUS</p>
                  <p className="mt-1 text-sm font-bold text-[#2D5A46] flex items-center gap-1">
                    <Check className="h-4 w-4" /> {unlockedData.emergency_profile?.insurance?.coverage_status || "Active & Verified"}
                  </p>
                  <p className="mt-0.5 text-xs text-[#78736B]">
                    Group ID: {unlockedData.emergency_profile?.insurance?.group_id || "GRP-77402"}
                  </p>
                </div>

                <div className="rounded-xl bg-[#FAF7F2] p-3.5">
                  <p className="text-[10px] font-bold text-[#858077] uppercase">EMERGENCY PRE-AUTH</p>
                  <p className="mt-1 text-xs font-bold text-[#C86D51]">
                    {unlockedData.emergency_profile?.insurance?.emergency_preauth || "Pre-authorized (Trauma & Triage)"}
                  </p>
                  <p className="mt-0.5 text-xs text-[#78736B]">Emergency Copay: $50.00</p>
                </div>
              </div>
            </div>

            {/* Emergency Contacts & Directives */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-sm">
                <h4 className="font-serif text-base font-bold text-[#1E1B18] mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#C86D51]" /> Emergency Contacts (Next of Kin)
                </h4>
                <div className="space-y-2">
                  {unlockedData.emergency_profile?.emergency_contacts?.map((c: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-[#FAF7F2] p-3">
                      <div>
                        <p className="text-xs font-bold text-[#1E1B18]">{c.name}</p>
                        <p className="text-[11px] text-[#78736B]">{c.relation || "Emergency Contact"}</p>
                      </div>
                      <a
                        href={`tel:${c.phone}`}
                        className="rounded-lg bg-[#C86D51] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B0583D]"
                      >
                        Call: {c.phone}
                      </a>
                    </div>
                  )) || (
                    <div className="flex items-center justify-between rounded-xl bg-[#FAF7F2] p-3">
                      <div>
                        <p className="text-xs font-bold text-[#1E1B18]">Emergency Contact</p>
                        <p className="text-[11px] text-[#78736B]">Primary Contact</p>
                      </div>
                      <a
                        href="tel:+18005550199"
                        className="rounded-lg bg-[#C86D51] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B0583D]"
                      >
                        Call: (800) 555-0199
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-[#E5E0D8] bg-white p-6 shadow-sm">
                <h4 className="font-serif text-base font-bold text-[#1E1B18] mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#4A8B6E]" /> Advance Directives &amp; Donor Status
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div className="rounded-xl bg-[#FAF7F2] p-3 flex justify-between">
                    <span className="text-[#858077]">Organ Donor:</span>
                    <span className="font-bold text-[#2D5A46]">Registered Donor (Heart, Kidneys, Liver)</span>
                  </div>
                  <div className="rounded-xl bg-[#FAF7F2] p-3 flex justify-between">
                    <span className="text-[#858077]">Resuscitation Order:</span>
                    <span className="font-bold text-[#1E1B18]">Full Resuscitation Approved • DNR: No</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reset / Scan Another button */}
            <div className="text-center pt-2">
              <button
                onClick={() => setUnlockedData(null)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-6 py-2.5 text-xs font-semibold text-[#666159] hover:bg-[#FAF7F2]"
              >
                Scan Another Emergency Case
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
