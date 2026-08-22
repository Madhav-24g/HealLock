import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, registerUser, setSession } from "../api";
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "../firebase";
import {
  Shield,
  Heart,
  ArrowRight,
  UserPlus,
  LogIn,
  Building2,
  AlertCircle,
  FileCheck2,
  Lock,
  CheckCircle2,
  UserCheck
} from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Registration state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regKind, setRegKind] = useState<"patient" | "staff">("patient");
  const [regRole, setRegRole] = useState("doctor");
  const [regBloodGroup, setRegBloodGroup] = useState("O+");
  const [regAllergies, setRegAllergies] = useState("");

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch {
        /* fallback */
      }

      const s = await login(email, password);
      setSession(s);
      nav(s.kind === "patient" ? "/patient" : "/hospital");
    } catch (ex: any) {
      setErr(ex?.message || "Invalid email address or password.");
    } finally {
      setLoading(false);
    }
  }

  async function onRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      try {
        await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      } catch {
        /* fallback */
      }

      const s = await registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        kind: regKind,
        role: regKind === "staff" ? regRole : undefined,
        blood_group: regKind === "patient" ? regBloodGroup : undefined,
        allergies: regKind === "patient" && regAllergies ? regAllergies.split(",").map((s) => s.trim()) : undefined,
      });
      setSession(s);
      nav(s.kind === "patient" ? "/patient" : "/hospital");
    } catch (ex: any) {
      setErr(ex?.message || "Registration failed. Please verify all required fields.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setErr("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userEmail = user.email || "user@heallock.example";

      let s;
      try {
        s = await login(userEmail, "oauth-secure-pass");
      } catch {
        s = await registerUser({
          name: user.displayName || "Authorized User",
          email: userEmail,
          password: "oauth-secure-pass",
          kind: "patient",
          blood_group: "O+",
          allergies: [],
        });
      }

      s.firebaseUser = { email: user.email, displayName: user.displayName, uid: user.uid };
      setSession(s);
      nav("/patient");
    } catch (ex: any) {
      if (ex?.code === "auth/popup-closed-by-user") {
        setErr("Single Sign-On was closed before completing.");
      } else {
        setErr("Single Sign-On network restricted. Please authenticate with your Registered Email & Password below.");
      }
    } finally {
      setLoading(false);
    }
  }

  const officialRoles = [
    { title: "Patient Dossier (Asha)", mail: "asha@heallock.example", role: "Patient" },
    { title: "Patient Dossier (Gourish)", mail: "gourish@heallock.example", role: "Patient" },
    { title: "Attending Physician (Dr. Vikram)", mail: "vikram.shah@stmarys.example", role: "Doctor" },
    { title: "Clinical Pharmacist (Priya)", mail: "priya.nair@stmarys.example", role: "Pharmacy" },
    { title: "Hospital Security Admin", mail: "kavita.admin@stmarys.example", role: "Admin" },
  ];

  function quickFill(mail: string) {
    setEmail(mail);
    setPassword("heallock");
    setErr("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0] p-6 text-[#1C1917] font-sans antialiased">
      <div className="w-full max-w-5xl grid grid-cols-1 gap-12 lg:grid-cols-12 items-center">
        
        {/* Left Side: National Health Architecture Statement */}
        <div className="space-y-6 lg:col-span-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E3A2F] text-white shadow-sm">
              <Shield className="h-6 w-6 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#2D6A4F] animate-pulse"></span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-[#57534E]">OFFICIAL HEALTH EXCHANGE</span>
              </div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1C1917]">HealLock</h1>
            </div>
          </div>

          <h2 className="font-serif text-3xl font-bold tracking-tight text-[#1C1917] lg:text-4xl leading-tight">
            Unified National Health Records &amp; Crisis Data Exchange
          </h2>

          <p className="text-sm leading-relaxed text-[#57534E]">
            A secure sovereign health network connecting patients, hospitals, and first responders under granular consent authorization and cryptographic accountability.
          </p>




          {/* Compliance Statement */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] font-semibold text-[#78716C]">
            <span className="flex items-center gap-1.5"><FileCheck2 className="h-4 w-4 text-[#2D6A4F]" /> HIPAA &amp; GDPR Standards</span>
            <span>•</span>
            <span>HL7 / FHIR Compliant</span>
            <span>•</span>
            <span>256-Bit Cryptographic Security</span>
          </div>
        </div>

        {/* Right Side: Secure Authentication Console */}
        <div className="lg:col-span-6 rounded-3xl border border-[#E7E5E4] bg-white p-8 shadow-sm">
          
          {/* Emergency Triage Access Link */}
          <div className="mb-6 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#DC2626] animate-ping"></span>
              <div>
                <p className="text-xs font-bold text-[#991B1B]">Emergency First Responder Portal</p>
                <p className="text-[10px] text-[#7F1D1D]">Single-factor crisis unlock for ER trauma stations</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => nav("/emergency")}
              className="rounded-xl bg-[#DC2626] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#B91C1C] transition-colors"
            >
              Crisis Terminal →
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-2xl bg-[#F5F5F4] p-1 border border-[#E7E5E4] mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setErr(""); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
                mode === "login"
                  ? "bg-white text-[#1C1917] shadow-xs"
                  : "text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setErr(""); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
                mode === "register"
                  ? "bg-white text-[#1C1917] shadow-xs"
                  : "text-[#78716C] hover:text-[#1C1917]"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" /> Register Account
            </button>
          </div>

          {err && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-[#991B1B] flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{err}</span>
            </div>
          )}

          {/* TAB 1: SIGN IN FORM */}
          {mode === "login" && (
            <>
              {/* Single Sign-On Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] py-2.5 text-xs font-bold text-[#1C1917] shadow-2xs hover:bg-white hover:border-[#1E3A2F] transition-all"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Authenticate with Verified Single Sign-On
              </button>

              <div className="relative my-4 flex items-center justify-center">
                <div className="w-full border-t border-[#F5F5F4]"></div>
                <span className="bg-white px-2 text-[10px] uppercase font-bold text-[#A8A29E]">or standard credentials</span>
                <div className="w-full border-t border-[#F5F5F4]"></div>
              </div>

              <form onSubmit={onLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#78716C] mb-1">OFFICIAL EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered email address"
                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-3.5 py-2.5 text-xs text-[#1C1917] focus:border-[#1E3A2F] focus:outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#78716C] mb-1">PASSWORD</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your secure password"
                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-3.5 py-2.5 text-xs text-[#1C1917] focus:border-[#1E3A2F] focus:outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A2F] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#152921] transition-colors"
                >
                  {loading ? "Authenticating Credentials…" : "Authenticate & Access Portal"} <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              {/* Official Profile Quick Select */}
              <div className="mt-6 border-t border-[#F5F5F4] pt-4">
                <p className="text-[11px] font-bold text-[#78716C] mb-2 uppercase flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-[#2D6A4F]" /> Authorized Directory Personas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {officialRoles.map((r) => (
                    <button
                      key={r.mail}
                      type="button"
                      onClick={() => quickFill(r.mail)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] transition-colors ${
                        email === r.mail
                          ? "border-[#1E3A2F] bg-[#E8F1EC] text-[#1E3A2F] font-bold"
                          : "border-[#E7E5E4] bg-white text-[#57534E] hover:bg-[#F5F5F4]"
                      }`}
                    >
                      <span>{r.title}</span>
                      <span className="font-mono text-[10px] text-[#A8A29E]">({r.role})</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: REGISTER / SIGN UP FORM */}
          {mode === "register" && (
            <form onSubmit={onRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#78716C] mb-1.5">ACCOUNT PROFILE TYPE</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegKind("patient")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-bold transition-all ${
                      regKind === "patient"
                        ? "border-[#1E3A2F] bg-[#E8F1EC] text-[#1E3A2F]"
                        : "border-[#E7E5E4] bg-white text-[#78716C]"
                    }`}
                  >
                    <Heart className="h-4 w-4" /> Patient Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegKind("staff")}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-bold transition-all ${
                      regKind === "staff"
                        ? "border-[#1E3A2F] bg-[#E8F1EC] text-[#1E3A2F]"
                        : "border-[#E7E5E4] bg-white text-[#78716C]"
                    }`}
                  >
                    <Building2 className="h-4 w-4" /> Clinical Staff
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#78716C] mb-1">LEGAL FULL NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Smith or John Doe"
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-3.5 py-2.5 text-xs text-[#1C1917] focus:border-[#1E3A2F] focus:outline-none"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#78716C] mb-1">OFFICIAL EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-3.5 py-2.5 text-xs text-[#1C1917] focus:border-[#1E3A2F] focus:outline-none"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#78716C] mb-1">ACCOUNT PASSWORD</label>
                <input
                  type="password"
                  required
                  placeholder="Create a strong account password"
                  className="w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-3.5 py-2.5 text-xs text-[#1C1917] focus:border-[#1E3A2F] focus:outline-none"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>

              {/* Patient Attributes */}
              {regKind === "patient" && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#78716C] mb-1">ABO/RH BLOOD GROUP</label>
                    <select
                      className="w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-3 py-2 text-xs text-[#1C1917]"
                      value={regBloodGroup}
                      onChange={(e) => setRegBloodGroup(e.target.value)}
                    >
                      {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#78716C] mb-1">KNOWN ALLERGIES</label>
                    <input
                      type="text"
                      placeholder="e.g. Penicillin, Sulfa"
                      className="w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-3 py-2 text-xs text-[#1C1917]"
                      value={regAllergies}
                      onChange={(e) => setRegAllergies(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Staff Attributes */}
              {regKind === "staff" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#78716C] mb-1">DESIGNATED CLINICAL ROLE</label>
                  <select
                    className="w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-3 py-2 text-xs text-[#1C1917]"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                  >
                    <option value="doctor">Attending Physician / Doctor</option>
                    <option value="pharmacist">Clinical Pharmacist</option>
                    <option value="emergency">Emergency / Trauma Responder</option>
                    <option value="receptionist">Patient Intake / Receptionist</option>
                    <option value="admin">Hospital Compliance Officer / Admin</option>
                  </select>
                </div>
              )}

              <button
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A2F] py-3 text-xs font-bold text-white shadow-xs hover:bg-[#152921] transition-colors mt-2"
              >
                {loading ? "Registering Official Profile…" : "Create Verified Health Record"} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
