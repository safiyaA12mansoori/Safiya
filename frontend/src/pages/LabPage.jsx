import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function LabPage() {
  const [orders, setOrders] = useState([]);
  const [tests, setTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patient: "", test: "" });
  const [error, setError] = useState("");

  async function load() {
    const [o, t, p] = await Promise.all([
      api("/api/lab/orders/"),
      api("/api/lab/tests/"),
      api("/api/patients/"),
    ]);
    setOrders(o.results || o);
    setTests(t.results || t);
    setPatients(p.results || p);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function createOrder(e) {
    e.preventDefault();
    await api("/api/lab/orders/", {
      method: "POST",
      body: JSON.stringify({
        clinic: Number(sessionStorage.getItem("mc_clinic")),
        patient: Number(form.patient),
        test: Number(form.test),
      }),
    });
    load();
  }

  async function complete(id) {
    await api(`/api/lab/orders/${id}/complete/`, {
      method: "POST",
      body: JSON.stringify({ result_text: "Within normal limits" }),
    });
    load();
  }

  return (
    <div>
      <h1 className="h3 mb-3">Laboratory</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="panel">
            {!orders.length ? (
              <div className="empty-state">No lab orders.</div>
            ) : (
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Test</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.patient_name}</td>
                      <td>{o.test_name}</td>
                      <td>{o.status}</td>
                      <td>
                        {o.status !== "completed" && (
                          <button className="btn btn-sm btn-success" onClick={() => complete(o.id)}>
                            Complete
                          </button>
                        )}
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
            <h2 className="h6">Order test</h2>
            <form className="vstack gap-2" onSubmit={createOrder}>
              <select className="form-select form-select-sm" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} required>
                <option value="">Patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
              <select className="form-select form-select-sm" value={form.test} onChange={(e) => setForm({ ...form, test: e.target.value })} required>
                <option value="">Test</option>
                {tests.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button className="btn btn-sm btn-success">Order</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
