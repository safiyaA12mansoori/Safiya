import { useEffect, useState } from "react";
import { api, qs } from "../api/client";

const emptyForm = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  phone: "",
  email: "",
  gender: "unspecified",
  city: "",
  force: false,
};

export default function PatientsPage() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [dupes, setDupes] = useState(null);
  const [selected, setSelected] = useState(null);

  async function load(q = search) {
    setLoading(true);
    setError("");
    try {
      const data = await api(`/api/patients/${qs({ search: q })}`);
      setRows(data.results || data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createPatient(e) {
    e.preventDefault();
    setDupes(null);
    try {
      const clinic = sessionStorage.getItem("mc_clinic");
      await api("/api/patients/", {
        method: "POST",
        body: JSON.stringify({ ...form, clinic: Number(clinic), force: form.force }),
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      if (err.status === 409) setDupes(err.data);
      else setError(err.message);
    }
  }

  async function openHistory(id) {
    const data = await api(`/api/patients/${id}/history/`);
    setSelected(data);
  }

  return (
    <div>
      <h1 className="h3 mb-3">Patients</h1>
      <div className="row g-3">
        <div className="col-lg-7">
          <div className="panel">
            <div className="d-flex gap-2 mb-3">
              <input
                className="form-control"
                placeholder="Search name, phone, MRN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="btn btn-teal btn-success" onClick={() => load(search)}>
                Search
              </button>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            {loading ? (
              <div className="loading-state">Loading patients…</div>
            ) : rows.length === 0 ? (
              <div className="empty-state">No patients found.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>MRN</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>DOB</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id}>
                        <td>{p.mrn}</td>
                        <td>
                          {p.first_name} {p.last_name}
                        </td>
                        <td>{p.phone}</td>
                        <td>{p.date_of_birth}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary" onClick={() => openHistory(p.id)}>
                            Profile
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="col-lg-5">
          <div className="panel mb-3">
            <h2 className="h6">Register patient</h2>
            <form onSubmit={createPatient} className="row g-2">
              {["first_name", "last_name", "phone", "email", "city"].map((k) => (
                <div className="col-6" key={k}>
                  <input
                    className="form-control form-control-sm"
                    placeholder={k.replace("_", " ")}
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    required={["first_name", "last_name", "phone"].includes(k)}
                  />
                </div>
              ))}
              <div className="col-6">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  required
                />
              </div>
              <div className="col-12 form-check ms-1">
                <input
                  id="force"
                  type="checkbox"
                  className="form-check-input"
                  checked={form.force}
                  onChange={(e) => setForm({ ...form, force: e.target.checked })}
                />
                <label htmlFor="force" className="form-check-label small">
                  Force create if duplicate detected
                </label>
              </div>
              {dupes && (
                <div className="col-12 alert alert-warning py-2 small">
                  Possible duplicates ({dupes.duplicates?.length}). Enable force to proceed.
                </div>
              )}
              <div className="col-12">
                <button className="btn btn-success btn-sm">Save patient</button>
              </div>
            </form>
          </div>
          {selected && (
            <div className="panel">
              <h2 className="h6">
                {selected.patient.full_name || `${selected.patient.first_name} ${selected.patient.last_name}`} ·{" "}
                {selected.patient.mrn}
              </h2>
              <div className="small text-muted mb-2">
                {selected.patient.phone} · {selected.patient.city}
              </div>
              <div className="small">
                Appointments: {selected.appointments.length} · Encounters: {selected.encounters.length} · Rx:{" "}
                {selected.prescriptions.length} · Invoices: {selected.invoices.length}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
