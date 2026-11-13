import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./api/auth";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import PatientsPage from "./pages/PatientsPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import QueuePage from "./pages/QueuePage";
import EmrPage from "./pages/EmrPage";
import BillingPage from "./pages/BillingPage";
import PharmacyPage from "./pages/PharmacyPage";
import LabPage from "./pages/LabPage";
import StaffPage from "./pages/StaffPage";
import NotificationsPage from "./pages/NotificationsPage";
import TvPage from "./pages/TvPage";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-state">Loading session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/tv" element={<TvPage />} />
      <Route path="/tv/:doctorId" element={<TvPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="queue" element={<QueuePage />} />
        <Route path="emr" element={<EmrPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="pharmacy" element={<PharmacyPage />} />
        <Route path="lab" element={<LabPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
