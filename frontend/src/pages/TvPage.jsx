import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";

export default function TvPage() {
  const { doctorId: paramId } = useParams();
  const [doctorId, setDoctorId] = useState(paramId || "");
  const [doctors, setDoctors] = useState([]);
  const [board, setBoard] = useState(null);

  useEffect(() => {
    api("/api/clinics/doctors/")
      .then((d) => {
        const docs = d.results || d;
        setDoctors(docs);
        if (!paramId && docs[0]) setDoctorId(String(docs[0].id));
      })
      .catch(() => {});
  }, [paramId]);

  useEffect(() => {
    if (!doctorId) return;
    let ws;
    async function pull() {
      const data = await api(`/api/queue/tv/${doctorId}/`);
      setBoard(data);
    }
    pull().catch(() => {});
    const proto = location.protocol === "https:" ? "wss" : "ws";
    try {
      ws = new WebSocket(`${proto}://${location.host}/ws/queue/tv/${doctorId}/`);
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        setBoard((prev) => ({
          ...(prev || {}),
          tokens: msg.tokens || prev?.tokens,
          now_serving: msg.now_serving,
        }));
      };
    } catch {
      /* REST fallback only */
    }
    const t = setInterval(pull, 8000);
    return () => {
      clearInterval(t);
      ws?.close();
    };
  }, [doctorId]);

  return (
    <div className="tv-board">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <div className="text-uppercase opacity-75">MediCore waiting room</div>
          <div className="display-6">Token display</div>
        </div>
        {!paramId && (
          <select className="form-select w-auto" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
        )}
      </div>
      {board?.is_paused && <div className="alert alert-warning">Queue paused</div>}
      <div className="mb-4">
        <div className="opacity-75">Now serving</div>
        <div className="tv-now">{board?.now_serving?.display_label || "—"}</div>
        <div className="fs-4 opacity-75">{board?.now_serving?.doctor_label || ""}</div>
      </div>
      <div className="row g-3">
        {(board?.tokens || []).map((t) => (
          <div className="col-6 col-md-3" key={t.display_label + t.status}>
            <div className="p-3 rounded-3" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="fs-2 fw-bold">{t.display_label}</div>
              <div className="text-uppercase small">{t.status}</div>
            </div>
          </div>
        ))}
      </div>
      {!board && <div className="mt-4 opacity-75">Loading board…</div>}
    </div>
  );
}
