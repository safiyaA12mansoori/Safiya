import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function StaffPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/staff/")
      .then((d) => setRows(d.results || d))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="h3 mb-3">Staff</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="panel">
        {!rows.length ? (
          <div className="empty-state">No staff profiles.</div>
        ) : (
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>{s.employee_id}</td>
                  <td>{s.full_name}</td>
                  <td>{s.role}</td>
                  <td>{s.department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
