import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function NotificationsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const data = await api("/api/notifications/");
    setRows(data.results || data);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function markAll() {
    await api("/api/notifications/mark_all_read/", { method: "POST", body: "{}" });
    load();
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Notifications</h1>
        <button className="btn btn-sm btn-outline-secondary" onClick={markAll}>
          Mark all read
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="panel">
        {!rows.length ? (
          <div className="empty-state">Inbox empty.</div>
        ) : (
          <ul className="list-group list-group-flush">
            {rows.map((n) => (
              <li key={n.id} className={`list-group-item ${n.is_read ? "" : "fw-semibold"}`}>
                <div>{n.title}</div>
                <div className="small text-muted">{n.message}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
