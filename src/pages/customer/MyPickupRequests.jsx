import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../../components/LoadingSpinner";
import PickupCard from "../../components/PickupCard";
import AlertMessage from "../../components/AlertMessage";
import { pickupService } from "../../services/pickupService";

const MyPickupRequests = () => {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "", urgency: "", waste: "", district: "" });

  useEffect(() => {
    pickupService.myRequests().then((response) => setPickups(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load pickup requests."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return pickups.filter((pickup) => {
      return (!filters.status || pickup.status === filters.status)
        && (!filters.urgency || pickup.urgency === filters.urgency)
        && (!filters.waste || pickup.waste_type === filters.waste)
        && (!filters.district || pickup.district.toLowerCase().includes(filters.district.toLowerCase()));
    });
  }, [pickups, filters]);

  const setFilter = (event) => setFilters({ ...filters, [event.target.name]: event.target.value });

  return (
    <>
      <h1 className="h3">My Pickup Requests</h1>
      <AlertMessage type="danger" message={error} />
      <div className="content-card mb-3">
        <div className="row g-2">
          <div className="col-md-3"><input className="form-control" name="district" placeholder="Search district" onChange={setFilter} /></div>
          <div className="col-md-3">
            <select className="form-select" name="status" onChange={setFilter}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option><option value="assigned">Assigned</option><option value="on_the_way">On the way</option><option value="collected">Collected</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-select" name="urgency" onChange={setFilter}>
              <option value="">All urgency</option><option value="normal">Normal</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="col-md-3"><input className="form-control" name="waste" placeholder="Waste type" onChange={setFilter} /></div>
        </div>
      </div>
      {loading ? <LoadingSpinner /> : (
        filtered.length === 0 ? <div className="content-card">No pickup requests match your filters.</div> : <div className="row g-3">
          {filtered.map((pickup) => (
            <div className="col-md-6 col-xl-4" key={pickup.id}>
              <PickupCard pickup={pickup} action={<Link className="btn btn-outline-success btn-sm" to={`/customer/pickups/${pickup.id}`}>View Details</Link>} />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default MyPickupRequests;
