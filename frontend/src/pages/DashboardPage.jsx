import { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { api } from "../api/client";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/dashboard/stats/")
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">Loading live dashboard…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!stats) return <div className="empty-state">No dashboard data.</div>;

  const statusLabels = (stats.appointments_by_status || []).map((s) => s.status);
  const statusCounts = (stats.appointments_by_status || []).map((s) => s.count);

  return (
    <div>
      <h1 className="h3 mb-3">Role dashboard</h1>
      <div className="stat-grid mb-3">
        <div className="stat">
          <div className="label">Patients</div>
          <div className="value">{stats.patients_total}</div>
        </div>
        <div className="stat">
          <div className="label">Appointments today</div>
          <div className="value">{stats.appointments_today}</div>
        </div>
        <div className="stat">
          <div className="label">Queue waiting</div>
          <div className="value">{stats.queue_waiting}</div>
        </div>
        <div className="stat">
          <div className="label">Now called</div>
          <div className="value">{stats.queue_called}</div>
        </div>
        {stats.collections_today != null && (
          <div className="stat">
            <div className="label">Collections today</div>
            <div className="value">₹{Number(stats.collections_today).toFixed(0)}</div>
          </div>
        )}
        {stats.my_appointments_today != null && (
          <div className="stat">
            <div className="label">My appointments</div>
            <div className="value">{stats.my_appointments_today}</div>
          </div>
        )}
      </div>
      <div className="row g-3">
        <div className="col-md-6">
          <div className="panel">
            <h2 className="h6">Appointments by status (today)</h2>
            {statusLabels.length ? (
              <Doughnut
                data={{
                  labels: statusLabels,
                  datasets: [
                    {
                      data: statusCounts,
                      backgroundColor: ["#0d7377", "#14919b", "#c45c26", "#7aa2a5", "#2a9d8f", "#e9c46a"],
                    },
                  ],
                }}
              />
            ) : (
              <div className="empty-state">No appointments today.</div>
            )}
          </div>
        </div>
        <div className="col-md-6">
          <div className="panel">
            <h2 className="h6">Queue snapshot</h2>
            <Bar
              data={{
                labels: ["Waiting", "Called"],
                datasets: [
                  {
                    label: "Tokens",
                    data: [stats.queue_waiting, stats.queue_called],
                    backgroundColor: ["#0d7377", "#c45c26"],
                  },
                ],
              }}
              options={{ plugins: { legend: { display: false } } }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
