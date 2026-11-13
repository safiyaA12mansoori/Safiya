import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function EmrPage() {
  const [rx, setRx] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    patient: "",
    doctor: "",
    medicine_name: "Paracetamol",
    dosage: "500mg",
    frequency: "TID",
    duration_days: 3,
    quantity: 9,
  });

  async function load() {
    const [r, p, d] = await Promise.all([
      api("/api/emr/prescriptions/"),
      api("/api/patients/"),
      api("/api/clinics/doctors/"),
    ]);
    setRx(r.results || r);
    setPatients(p.results || p);
    setDoctors(d.results || d);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function createRx(e) {
    e.preventDefault();
    try {
      await api("/api/emr/prescriptions/", {
        method: "POST",
        body: JSON.stringify({
          clinic: Number(sessionStorage.getItem("mc_clinic")),
          patient: Number(form.patient),
          doctor: Number(form.doctor),
          status: "active",
          items: [
            {
              medicine_name: form.medicine_name,
              dosage: form.dosage,
              frequency: form.frequency,
              duration_days: Number(form.duration_days),
              quantity: Number(form.quantity),
            },
          ],
        }),
      });
      load();
    } catch (err) {
      setError(JSON.stringify(err.data || err.message));
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">EMR / Prescriptions</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-3">
        <div className="col-lg-7">
          <div className="panel">
            {!rx.length ? (
              <div className="empty-state">No prescriptions.</div>
            ) : (
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Status</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {rx.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{r.patient}</td>
                      <td>{r.status}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={async () => {
                            const token = sessionStorage.getItem("mc_access");
                            const clinic = sessionStorage.getItem("mc_clinic");
                            const res = await fetch(`/api/emr/prescriptions/${r.id}/pdf/`, {
                              headers: {
                                Authorization: `Bearer ${token}`,
                                "X-Clinic-Id": clinic || "",
                              },
                            });
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `prescription-${r.id}.pdf`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="panel">
            <h2 className="h6">New prescription</h2>
            <form className="vstack gap-2" onSubmit={createRx}>
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
              <input className="form-control form-control-sm" value={form.medicine_name} onChange={(e) => setForm({ ...form, medicine_name: e.target.value })} />
              <div className="row g-2">
                <div className="col">
                  <input className="form-control form-control-sm" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} />
                </div>
                <div className="col">
                  <input className="form-control form-control-sm" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-sm btn-success">Create Rx</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
