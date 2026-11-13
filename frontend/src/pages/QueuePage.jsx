import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

export default function QueuePage() {
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [tokens, setTokens] = useState([]);
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [live, setLive] = useState("idle");

  const clinic = sessionStorage.getItem("mc_clinic");

  async function refresh() {
    if (!doctorId) return;
    const [tok, sess] = await Promise.all([
      api(`/api/queue/tokens/?doctor=${doctorId}`),
      api(`/api/queue/sessions/?doctor=${doctorId}`),
    ]);
    setTokens(tok.results || tok);
    const sessions = sess.results || sess;
    setSession(sessions[0] || null);
  }

  useEffect(() => {
    Promise.all([api("/api/clinics/doctors/"), api("/api/patients/")]).then(([d, p]) => {
      const docs = d.results || d;
      setDoctors(docs);
      setPatients(p.results || p);
      if (docs[0]) setDoctorId(String(docs[0].id));
    });
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    refresh().catch((e) => setError(e.message));
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws/queue/staff/${doctorId}/`);
    ws.onopen = () => setLive("connected");
    ws.onclose = () => setLive("disconnected");
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.tokens) setTokens(msg.tokens);
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, [doctorId]);

  async function issue(emergency = false) {
    setError("");
    try {
      await api("/api/queue/tokens/", {
        method: "POST",
        body: JSON.stringify({
          clinic: Number(clinic),
          doctor: Number(doctorId),
          patient: Number(patientId),
          is_emergency: emergency,
        }),
      });
      refresh();
    } catch (e) {
      setError(e.data?.detail || e.message);
    }
  }

  async function callNext() {
    if (!session) return;
    try {
      await api(`/api/queue/sessions/${session.id}/call_next/`, { method: "POST", body: "{}" });
      refresh();
    } catch (e) {
      setError(e.data?.detail || e.message);
    }
  }

  async function act(tokenId, action) {
    await api(`/api/queue/tokens/${tokenId}/${action}/`, { method: "POST", body: "{}" });
    refresh();
  }

  async function togglePause() {
    if (!session) return;
    const path = session.is_paused ? "resume" : "pause";
    const updated = await api(`/api/queue/sessions/${session.id}/${path}/`, {
      method: "POST",
      body: JSON.stringify({ reason: "Break" }),
    });
    setSession(updated);
  }

  const waiting = useMemo(() => tokens.filter((t) => t.status === "waiting" || t.status === "called" || t.status === "skipped"), [tokens]);

  return (
    <div>
      <h1 className="h3 mb-3">Real-time token queue</h1>
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <select className="form-select form-select-sm w-auto" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name}
            </option>
          ))}
        </select>
        <select className="form-select form-select-sm w-auto" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Select patient</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.first_name} {p.last_name}
            </option>
          ))}
        </select>
        <button className="btn btn-sm btn-success" disabled={!patientId} onClick={() => issue(false)}>
          Issue token
        </button>
        <button className="btn btn-sm btn-warning" disabled={!patientId} onClick={() => issue(true)}>
          Emergency
        </button>
        <button className="btn btn-sm btn-primary" onClick={callNext}>
          Call next
        </button>
        <button className="btn btn-sm btn-outline-secondary" onClick={togglePause} disabled={!session}>
          {session?.is_paused ? "Resume" : "Pause"}
        </button>
        <span className="badge text-bg-light">WS: {live}</span>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="panel">
        {!waiting.length ? (
          <div className="empty-state">Queue empty.</div>
        ) : (
          <table className="table table-sm align-middle">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {waiting.map((t) => (
                <tr key={t.id}>
                  <td>
                    {t.display_label} {t.is_emergency && <span className="badge badge-emergency">EMG</span>}
                  </td>
                  <td>{t.patient_name}</td>
                  <td>{t.status}</td>
                  <td className="text-nowrap">
                    <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => act(t.id, "skip")}>
                      Skip
                    </button>
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => act(t.id, "recall")}>
                      Recall
                    </button>
                    <button className="btn btn-sm btn-outline-success" onClick={() => act(t.id, "complete")}>
                      Done
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
