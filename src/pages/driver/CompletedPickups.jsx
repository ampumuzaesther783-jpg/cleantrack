import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import AlertMessage from "../../components/AlertMessage";
import { assignmentService } from "../../services/assignmentService";
import { formatDate } from "../../utils/formatDate";

const CompletedPickups = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    assignmentService.driverJobs().then((response) => {
      setJobs(response.data.filter((job) => job.status === "collected"));
    }).catch((requestError) => setError(requestError.response?.data?.message || "Could not load completed pickups."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h1 className="h3">Completed Pickups</h1>
      <AlertMessage type="danger" message={error} />
      {loading ? <LoadingSpinner /> : (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Location</th><th>Waste</th><th>Quantity</th><th>Status</th><th>Completed</th></tr></thead>
            <tbody>
              {jobs.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No completed pickups yet.</td></tr>}
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.location_name}</td>
                  <td>{job.waste_type}</td>
                  <td>{job.waste_quantity_collected || "Not recorded"}</td>
                  <td><StatusBadge status={job.status} /></td>
                  <td>{formatDate(job.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default CompletedPickups;
