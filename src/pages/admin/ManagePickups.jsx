import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import { adminService } from "../../services/adminService";
import { formatDate } from "../../utils/formatDate";
import AlertMessage from "../../components/AlertMessage";

const ManagePickups = () => {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", urgency: "", district: "", waste: "", date: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    adminService.pickups().then((response) => setPickups(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load pickups."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => pickups.filter((pickup) => (
    (!filters.status || pickup.status === filters.status)
    && (!filters.urgency || pickup.urgency === filters.urgency)
    && (!filters.district || pickup.district?.toLowerCase().includes(filters.district.toLowerCase()))
    && (!filters.waste || pickup.waste_type?.toLowerCase().includes(filters.waste.toLowerCase()))
    && (!filters.date || String(pickup.requested_at).startsWith(filters.date))
  )), [pickups, filters]);

  return (
    <>
      <h1 className="h3">Manage Pickups</h1>
      <AlertMessage type="danger" message={error} />
      <div className="content-card mb-3">
        <div className="row g-2">
          <div className="col-md"><input className="form-control" placeholder="District" onChange={(e) => setFilters({ ...filters, district: e.target.value })} /></div>
          <div className="col-md"><input className="form-control" placeholder="Waste" onChange={(e) => setFilters({ ...filters, waste: e.target.value })} /></div>
          <div className="col-md"><input className="form-control" type="date" onChange={(e) => setFilters({ ...filters, date: e.target.value })} /></div>
          <div className="col-md"><select className="form-select" onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}><option value="">Urgency</option><option value="normal">Normal</option><option value="urgent">Urgent</option></select></div>
          <div className="col-md"><select className="form-select" onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Status</option><option value="pending">Pending</option><option value="assigned">Assigned</option><option value="on_the_way">On the way</option><option value="collected">Collected</option><option value="failed">Failed</option></select></div>
        </div>
      </div>
      {loading ? <LoadingSpinner /> : (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Customer</th><th>Location</th><th>Waste</th><th>Status</th><th>Requested</th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No pickups match these filters.</td></tr>}
              {filtered.map((pickup) => (
                <tr key={pickup.id}>
                  <td>{pickup.customer_name}</td>
                  <td>{pickup.location_name}, {pickup.district}</td>
                  <td>{pickup.waste_type}</td>
                  <td><StatusBadge status={pickup.status} /></td>
                  <td>{formatDate(pickup.requested_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default ManagePickups;
