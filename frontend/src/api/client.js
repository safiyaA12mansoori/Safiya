const API_BASE = import.meta.env.VITE_API_BASE || "";

function getToken() {
  return sessionStorage.getItem("mc_access") || "";
}

function getClinicId() {
  return sessionStorage.getItem("mc_clinic") || "";
}

export function setSession({ access, refresh, clinicId }) {
  if (access) sessionStorage.setItem("mc_access", access);
  if (refresh) sessionStorage.setItem("mc_refresh", refresh);
  if (clinicId != null) sessionStorage.setItem("mc_clinic", String(clinicId));
}

export function clearSession() {
  sessionStorage.removeItem("mc_access");
  sessionStorage.removeItem("mc_refresh");
  sessionStorage.removeItem("mc_clinic");
  sessionStorage.removeItem("mc_user");
}

export async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const clinicId = getClinicId();
  if (clinicId) headers["X-Clinic-Id"] = clinicId;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { detail: text };
  }

  if (!res.ok) {
    const err = new Error(data?.detail || res.statusText || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function qs(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}
