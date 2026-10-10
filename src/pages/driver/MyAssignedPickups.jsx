import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../../components/LoadingSpinner";
import PickupCard from "../../components/PickupCard";
import AlertMessage from "../../components/AlertMessage";
import { assignmentService } from "../../services/assignmentService";

const MyAssignedPickups = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", district: "", urgency: "" });

  useEffect(() => {
    assignmentService.driverJobs().then((response) => setJobs(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load assigned pickups."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => jobs.filter((job) => (
    (!filters.status || job.status === filters.status)
    && (!filters.urgency || job.urgency === filters.urgency)
    && (!filters.district || job.district.toLowerCase().includes(filters.district.toLowerCase()))
  )), [jobs, filters]);

  return (
    <>
      <h1 className="h3">Assigned Pickups</h1>
      <AlertMessage type="danger" message={error} />
      <div className="content-card mb-3">
        <div className="row g-2">
          <div className="col-md-4"><input className="form-control" placeholder="District" onChange={(e) => setFilters({ ...filters, district: e.target.value })} /></div>
          <div className="col-md-4">
            <select className="form-select" onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All statuses</option><option value="assigned">Assigned</option><option value="on_the_way">On the way</option><option value="collected">Collected</option><option value="failed">Failed</option>
            </select>
          </div>
          <div className="col-md-4">
            <select className="form-select" onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}>
              <option value="">All urgency</option><option value="normal">Normal</option><option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>
      {loading ? <LoadingSpinner /> : (
        filtered.length === 0 ? <div className="content-card">No assigned pickups match your filters.</div> : <div className="row g-3">
          {filtered.map((job) => (
            <div className="col-md-6 col-xl-4" key={job.id}>
              <PickupCard pickup={{ ...job, status: job.status }} action={<Link className="btn btn-outline-success btn-sm" to={`/driver/jobs/${job.id}`}>Update Job</Link>} />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default MyAssignedPickups;
