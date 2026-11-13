import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../api/auth";

const LINKS = [
  { to: "/", label: "Dashboard", icon: "bi-speedometer2", roles: null },
  { to: "/patients", label: "Patients", icon: "bi-people", roles: ["super_admin", "clinic_owner", "receptionist", "doctor", "nurse"] },
  { to: "/appointments", label: "Appointments", icon: "bi-calendar2-check", roles: ["super_admin", "clinic_owner", "receptionist", "doctor", "nurse"] },
  { to: "/queue", label: "Token Queue", icon: "bi-list-ol", roles: ["super_admin", "clinic_owner", "receptionist", "doctor", "nurse"] },
  { to: "/emr", label: "EMR / Rx", icon: "bi-clipboard2-pulse", roles: ["super_admin", "clinic_owner", "doctor", "nurse"] },
  { to: "/billing", label: "Billing", icon: "bi-receipt", roles: ["super_admin", "clinic_owner", "accountant"] },
  { to: "/pharmacy", label: "Pharmacy", icon: "bi-capsule", roles: ["super_admin", "clinic_owner", "doctor", "nurse", "receptionist"] },
  { to: "/lab", label: "Lab", icon: "bi-eyedropper", roles: ["super_admin", "clinic_owner", "doctor", "nurse"] },
  { to: "/staff", label: "Staff", icon: "bi-person-badge", roles: ["super_admin", "clinic_owner"] },
  { to: "/notifications", label: "Notifications", icon: "bi-bell", roles: null },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  const visible = LINKS.filter((l) => !l.roles || l.roles.includes(role) || role === "super_admin");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">MediCore</div>
        <div className="small mb-3 opacity-75">Healthcare ERP</div>
        <nav>
          {visible.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"}>
              <i className={`bi ${l.icon}`} />
              {l.label}
            </NavLink>
          ))}
          <NavLink to="/tv" target="_blank">
            <i className="bi bi-tv" />
            TV Display
          </NavLink>
        </nav>
      </aside>
      <div className="main-panel">
        <div className="topbar">
          <div>
            <div className="fw-semibold">
              {user?.first_name || user?.username} · {role?.replace("_", " ")}
            </div>
            <div className="small text-muted">
              Clinic #{sessionStorage.getItem("mc_clinic") || "—"}
            </div>
          </div>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
