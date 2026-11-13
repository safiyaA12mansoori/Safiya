import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ patient: "", description: "Consultation", unit_price: "500" });

  async function load() {
    const [i, p] = await Promise.all([api("/api/billing/invoices/"), api("/api/patients/")]);
    setInvoices(i.results || i);
    setPatients(p.results || p);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function createInvoice(e) {
    e.preventDefault();
    try {
      await api("/api/billing/invoices/", {
        method: "POST",
        body: JSON.stringify({
          clinic: Number(sessionStorage.getItem("mc_clinic")),
          patient: Number(form.patient),
          status: "draft",
          items: [{ description: form.description, quantity: 1, unit_price: form.unit_price, tax_percent: 0 }],
        }),
      });
      load();
    } catch (err) {
      setError(JSON.stringify(err.data || err.message));
    }
  }

  async function pay(invoice) {
    await api("/api/billing/payments/", {
      method: "POST",
      body: JSON.stringify({
        invoice: invoice.id,
        clinic: invoice.clinic,
        amount: invoice.balance_due || invoice.subtotal,
        method: "upi",
      }),
    });
    load();
  }

  async function issue(id) {
    await api(`/api/billing/invoices/${id}/issue/`, { method: "POST", body: "{}" });
    load();
  }

  return (
    <div>
      <h1 className="h3 mb-3">Billing & finance</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="row g-3">
        <div className="col-lg-8">
          <div className="panel">
            {!invoices.length ? (
              <div className="empty-state">No invoices.</div>
            ) : (
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Patient</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Due</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.invoice_number}</td>
                      <td>{inv.patient_name}</td>
                      <td>{inv.status}</td>
                      <td>₹{inv.subtotal}</td>
                      <td>₹{inv.balance_due}</td>
                      <td className="text-nowrap">
                        {inv.status === "draft" && (
                          <button className="btn btn-sm btn-outline-primary me-1" onClick={() => issue(inv.id)}>
                            Issue
                          </button>
                        )}
                        {Number(inv.balance_due) > 0 && inv.status !== "void" && (
                          <button className="btn btn-sm btn-success" onClick={() => pay(inv)}>
                            Record payment
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
            <h2 className="h6">New invoice</h2>
            <form className="vstack gap-2" onSubmit={createInvoice}>
              <select className="form-select form-select-sm" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} required>
                <option value="">Patient</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>
              <input className="form-control form-control-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <input className="form-control form-control-sm" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
              <button className="btn btn-sm btn-success">Create</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
