import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import AlertMessage from "../../components/AlertMessage";
import { assignmentService } from "../../services/assignmentService";

const ManagerDashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    assignmentService.companyJobs().then((response) => setJobs(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load manager dashboard."))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    assigned: jobs.filter((job) => job.status === "assigned").length,
    on_the_way: jobs.filter((job) => job.status === "on_the_way").length,
    collected: jobs.filter((job) => job.status === "collected").length,
    failed: jobs.filter((job) => job.status === "failed").length
  };

  return (
    <>
      <h1 className="h3">Manager Dashboard</h1>
      {loading ? <LoadingSpinner /> : (
        <>
          <AlertMessage type="danger" message={error} />
          <div className="row g-3 mb-4">
            {Object.entries(counts).map(([label, value]) => (
              <div className="col-6 col-lg-3" key={label}>
                <div className="stat-card">
                  <div className="text-muted text-capitalize">{label.replaceAll("_", " ")}</div>
                  <div className="h3 mb-0">{value}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead><tr><th>Pickup</th><th>Driver</th><th>Truck</th><th>Status</th></tr></thead>
              <tbody>
                {jobs.length === 0 && <tr><td colSpan="4" className="text-center text-muted py-4">No company pickups yet.</td></tr>}
                {jobs.slice(0, 8).map((job) => (
                  <tr key={job.id}>
                    <td>{job.location_name}</td>
                    <td>{job.driver_name}</td>
                    <td>{job.truck_number_plate}</td>
                    <td><StatusBadge status={job.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
};

export default ManagerDashboard;
