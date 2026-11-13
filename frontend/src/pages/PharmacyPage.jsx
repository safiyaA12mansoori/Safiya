import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function PharmacyPage() {
  const [meds, setMeds] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", strength: "", stock_quantity: 100, unit_price: 10 });

  async function load() {
    const data = await api("/api/pharmacy/medicines/");
    setMeds(data.results || data);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function createMed(e) {
    e.preventDefault();
    await api("/api/pharmacy/medicines/", {
      method: "POST",
      body: JSON.stringify({ ...form, clinic: Number(sessionStorage.getItem("mc_clinic")) }),
    });
    setForm({ name: "", strength: "", stock_quantity: 100, unit_price: 10 });
    load();
  }

  async function stockIn(med) {
    await api("/api/pharmacy/stock-movements/", {
      method: "POST",
      body: JSON.stringify({ medicine: med.id, kind: "in", quantity: 50, note: "Restock" }),
    });
    load();
  }

  return (
    <div>
      <h1 className="h3 mb-3">Pharmacy</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="panel">
            {!meds.length ? (
              <div className="empty-state">No medicines.</div>
            ) : (
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Strength</th>
                    <th>Stock</th>
                    <th>Price</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {meds.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.strength}</td>
                      <td>{m.stock_quantity}</td>
                      <td>₹{m.unit_price}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-success" onClick={() => stockIn(m)}>
                          +50 stock
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
            <h2 className="h6">Add medicine</h2>
            <form className="vstack gap-2" onSubmit={createMed}>
              <input className="form-control form-control-sm" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className="form-control form-control-sm" placeholder="Strength" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} />
              <button className="btn btn-sm btn-success">Save</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
