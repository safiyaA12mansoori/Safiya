import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../api/auth";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("demo_reception");
  const [password, setPassword] = useState("MediCore@Demo1");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err.data?.detail || err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="h-brand mb-1">MediCore</div>
        <p className="text-muted mb-4">Enterprise clinic management — sign in with your role account.</p>
        {error && <div className="alert alert-danger py-2">{String(error)}</div>}
        <div className="mb-3">
          <label className="form-label">Username</label>
          <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-success w-100" disabled={busy} style={{ background: "#0d7377", border: 0 }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="small text-muted mt-3 mb-0">
          Demo: demo_doctor / MediCore@Demo1 · superadmin / MediCore@Admin1
        </p>
      </form>
    </div>
  );
}
