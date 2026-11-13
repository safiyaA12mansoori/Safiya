import React, { createContext, useContext, useEffect, useState } from "react";
import { api, clearSession, setSession } from "./client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("mc_user") || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!!sessionStorage.getItem("mc_access"));

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!sessionStorage.getItem("mc_access")) {
        setLoading(false);
        return;
      }
      try {
        const me = await api("/api/auth/me/");
        if (!cancelled) {
          setUser(me);
          sessionStorage.setItem("mc_user", JSON.stringify(me));
          if (!sessionStorage.getItem("mc_clinic") && me.clinics?.[0]) {
            sessionStorage.setItem("mc_clinic", String(me.clinics[0].id));
          }
        }
      } catch {
        clearSession();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(username, password) {
    const data = await api("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    const clinicId = data.user.clinics?.[0]?.id || "";
    setSession({
      access: data.tokens.access,
      refresh: data.tokens.refresh,
      clinicId,
    });
    sessionStorage.setItem("mc_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  function setClinic(id) {
    sessionStorage.setItem("mc_clinic", String(id));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setClinic }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
