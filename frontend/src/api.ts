const API = "/api";

export type Session = {
  token: string;
  kind: string;
  role: string | null;
  name: string;
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

export async function api(path: string, opts: RequestInit = {}) {
  const s = getSession();
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) };
  if (s?.token) headers.Authorization = `Bearer ${s.token}`;
  if (opts.body && !(opts.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.detail || JSON.stringify(j);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function login(email: string, password: string): Promise<Session> {
  const body = new URLSearchParams({ username: email.trim().toLowerCase(), password });
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    let msg = "Login failed: Invalid email or password";
    try {
      const j = await res.json();
      if (j.detail) msg = j.detail;
    } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  const session: Session = { token: data.access_token, kind: data.kind, role: data.role, name: data.name };
  setSession(session);
  return session;
}

export async function registerUser(payload: any): Promise<Session> {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = "Registration failed";
    try {
      const j = await res.json();
      if (j.detail) msg = j.detail;
    } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  const session: Session = { token: data.access_token, kind: data.kind, role: data.role, name: data.name };
  setSession(session);
  return session;
}
