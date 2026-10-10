import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { pickupService } from "../../services/pickupService";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import AlertMessage from "../../components/AlertMessage";

const CustomerDashboard = () => {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    pickupService.myRequests().then((response) => setPickups(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load pickup requests."))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    total: pickups.length,
    pending: pickups.filter((item) => item.status === "pending").length,
    collected: pickups.filter((item) => item.status === "collected").length,
    failed: pickups.filter((item) => item.status === "failed").length
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h1 className="h3 mb-0">Resident Dashboard</h1>
        <Link to="/customer/report-bin" className="btn btn-cleantrack">Report Full Bin</Link>
      </div>
      {loading ? <LoadingSpinner /> : (
        <>
          <AlertMessage type="danger" message={error} />
          <div className="row g-3 mb-4">
            {Object.entries(counts).map(([label, value]) => (
              <div className="col-6 col-lg-3" key={label}>
                <div className="stat-card">
                  <div className="text-muted text-capitalize">{label}</div>
                  <div className="h3 mb-0">{value}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="content-card">
            <h2 className="h5">Recent Pickup Requests</h2>
            <div className="table-responsive border-0">
              <table className="table align-middle mb-0">
                <thead><tr><th>Location</th><th>Waste</th><th>Urgency</th><th>Status</th></tr></thead>
                <tbody>
                  {pickups.length === 0 && <tr><td colSpan="4" className="text-center text-muted py-4">No pickup requests yet.</td></tr>}
                  {pickups.slice(0, 5).map((pickup) => (
                    <tr key={pickup.id}>
                      <td>{pickup.location_name}</td>
                      <td>{pickup.waste_type}</td>
                      <td>{pickup.urgency}</td>
                      <td><StatusBadge status={pickup.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default CustomerDashboard;
