import { Navigate, Route, Routes } from "react-router-dom";
import { getSession } from "./api";
import Login from "./pages/Login";
import PatientHome from "./pages/PatientHome";
import HospitalHome from "./pages/HospitalHome";
import EmergencyTriage from "./pages/EmergencyTriage";

function Guard({ kind, children }: { kind: "patient" | "staff"; children: JSX.Element }) {
  const s = getSession();
  if (!s) return <Navigate to="/" replace />;
  if (s.kind !== kind) return <Navigate to={s.kind === "patient" ? "/patient" : "/hospital"} replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1E1B18]">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/emergency" element={<EmergencyTriage />} />
        <Route
          path="/patient"
          element={
            <Guard kind="patient">
              <PatientHome />
            </Guard>
          }
        />
        <Route
          path="/hospital"
          element={
            <Guard kind="staff">
              <HospitalHome />
            </Guard>
          }
        />
      </Routes>
    </div>
  );
}
