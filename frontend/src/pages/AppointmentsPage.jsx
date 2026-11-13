import { useEffect, useState } from "react";
import { api, qs } from "../api/client";

export default function AppointmentsPage() {
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    patient: "",
    doctor: "",
    start_time: "",
    end_time: "",
    reason: "",
    status: "scheduled",
  });

  async function load() {
    setLoading(true);
    try {
      const [a, p, d] = await Promise.all([
        api(`/api/appointments/${qs({ ordering: "start_time" })}`),
        api("/api/patients/"),
        api("/api/clinics/doctors/"),
      ]);
      setRows(a.results || a);
      setPatients(p.results || p);
      setDoctors(d.results || d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createAppt(e) {
    e.preventDefault();
    setError("");
    try {
      const clinic = Number(sessionStorage.getItem("mc_clinic"));
      await api("/api/appointments/", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          clinic,
          patient: Number(form.patient),
          doctor: Number(form.doctor),
        }),
      });
      load();
    } catch (err) {
      setError(JSON.stringify(err.data || err.message));
    }
  }

  async function setStatus(id, status) {
    await api(`/api/appointments/${id}/set_status/`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div>
      <h1 className="h3 mb-3">Appointments</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="panel">
            {loading ? (
              <div className="loading-state">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="empty-state">No appointments.</div>
            ) : (
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id}>
                      <td>{new Date(a.start_time).toLocaleString()}</td>
                      <td>{a.patient_name}</td>
                      <td>{a.doctor_name}</td>
                      <td>
                        <span className="badge text-bg-secondary">{a.status}</span>
                      </td>
                      <td className="text-nowrap">
                        <button className="btn btn-sm btn-outline-success me-1" onClick={() => setStatus(a.id, "confirmed")}>
                          Confirm
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setStatus(a.id, "cancelled")}>
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="col-lg-4">
          <div className="panel">
            <h2 className="h6">Book appointment</h2>
            <form className="vstack gap-2" onSubmit={createAppt}>
              <select className="form-select form-select-sm" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} required>
                <option value="">Patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
              <select className="form-select form-select-sm" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} required>
                <option value="">Doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
              <input type="datetime-local" className="form-control form-control-sm" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
              <input type="datetime-local" className="form-control form-control-sm" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
              <input className="form-control form-control-sm" placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              <button className="btn btn-success btn-sm">Save</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
