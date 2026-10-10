import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { adminService } from "../../services/adminService";
import AlertMessage from "../../components/AlertMessage";

const labels = {
  total_pickup_requests: "Total pickups",
  pending_pickups: "Pending",
  completed_pickups: "Completed",
  failed_pickups: "Failed",
  active_trucks: "Active trucks",
  active_drivers: "Active drivers",
  waste_collected_this_month: "Waste this month"
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminService.stats().then((response) => setStats(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load admin statistics."));
  }, []);

  if (!stats && !error) return <LoadingSpinner />;

  return (
    <>
      <h1 className="h3">Admin Dashboard</h1>
      <AlertMessage type="danger" message={error} />
      {stats && <div className="row g-3">
        {Object.entries(labels).map(([key, label]) => (
          <div className="col-6 col-lg-3" key={key}>
            <div className="stat-card">
              <div className="text-muted">{label}</div>
              <div className="h3 mb-0">{stats[key] || 0}</div>
            </div>
          </div>
        ))}
      </div>}
    </>
  );
};

export default AdminDashboard;
