import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import AlertMessage from "../../components/AlertMessage";
import { assignmentService } from "../../services/assignmentService";
import { formatDate } from "../../utils/formatDate";

const CompanyPickups = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", district: "", date: "" });

  useEffect(() => {
    assignmentService.companyJobs().then((response) => setJobs(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load company pickups."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => jobs.filter((job) => (
    (!filters.status || job.status === filters.status)
    && (!filters.district || job.district?.toLowerCase().includes(filters.district.toLowerCase()))
    && (!filters.date || String(job.assigned_at).startsWith(filters.date))
  )), [jobs, filters]);

  return (
    <>
      <h1 className="h3">Company Pickup History</h1>
      <AlertMessage type="danger" message={error} />
      <div className="content-card mb-3">
        <div className="row g-2">
          <div className="col-md-4"><input className="form-control" placeholder="District" onChange={(e) => setFilters({ ...filters, district: e.target.value })} /></div>
          <div className="col-md-4"><input className="form-control" type="date" onChange={(e) => setFilters({ ...filters, date: e.target.value })} /></div>
          <div className="col-md-4">
            <select className="form-select" onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All statuses</option><option value="assigned">Assigned</option><option value="on_the_way">On the way</option><option value="collected">Collected</option><option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>
      {loading ? <LoadingSpinner /> : (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Location</th><th>Driver</th><th>Truck</th><th>Status</th><th>Assigned</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No pickups match your filters.</td></tr>}
              {filtered.map((job) => (
                <tr key={job.id}>
                  <td>{job.location_name}</td>
                  <td>{job.driver_name}</td>
                  <td>{job.truck_number_plate}</td>
                  <td><StatusBadge status={job.status} /></td>
                  <td>{formatDate(job.assigned_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default CompanyPickups;
