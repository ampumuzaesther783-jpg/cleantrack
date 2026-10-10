import { useEffect, useState } from "react";
import AlertMessage from "../../components/AlertMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import { assignmentService } from "../../services/assignmentService";
import { pickupService } from "../../services/pickupService";
import { truckService } from "../../services/truckService";

const AssignPickups = () => {
  const [pending, setPending] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ pickup_request_id: "", truck_id: "", driver_id: "" });

  const loadData = () => {
    setLoading(true);
    Promise.all([pickupService.pending(), truckService.companyTrucks()])
      .then(([pickupResponse, truckResponse]) => {
        setPending(pickupResponse.data);
        setTrucks(truckResponse.data);
      })
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load pickups and company trucks."))
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  const assignPickup = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      await assignmentService.create(form);
      setMessage("Pickup assigned.");
      setForm({ pickup_request_id: "", truck_id: "", driver_id: "" });
      loadData();
    } catch (error) {
      setError(error.response?.data?.message || "Could not assign pickup");
    }
  };

  const selectTruck = (truckId) => {
    const truck = trucks.find((item) => String(item.id) === String(truckId));
    setForm({ ...form, truck_id: truckId, driver_id: truck?.driver_id || form.driver_id });
  };

  return (
    <>
      <div className="content-card mb-3">
        <h1 className="h3">Assign Pickup Request</h1>
        <AlertMessage type={message.includes("Could") ? "danger" : "success"} message={message} />
        <AlertMessage type="danger" message={error} />
        <form className="row g-2" onSubmit={assignPickup}>
          <div className="col-lg-4">
            <select className="form-select" value={form.pickup_request_id} onChange={(e) => setForm({ ...form, pickup_request_id: e.target.value })} required>
              <option value="">Select pending pickup</option>
              {pending.map((pickup) => <option key={pickup.id} value={pickup.id}>#{pickup.id} {pickup.location_name} - {pickup.district}</option>)}
            </select>
          </div>
          <div className="col-lg-3">
            <select className="form-select" value={form.truck_id} onChange={(e) => selectTruck(e.target.value)} required>
              <option value="">Select truck</option>
              {trucks.filter((truck) => truck.status === "active").map((truck) => <option key={truck.id} value={truck.id}>{truck.truck_number_plate}</option>)}
            </select>
          </div>
          <div className="col-lg-3">
            <input className="form-control" placeholder="Driver user ID" value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} required />
          </div>
          <div className="col-lg-2"><button className="btn btn-cleantrack w-100">Assign</button></div>
        </form>
      </div>
      {loading ? <LoadingSpinner /> : (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Request</th><th>District</th><th>Waste</th><th>Urgency</th><th>Status</th></tr></thead>
            <tbody>
              {pending.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">There are no pending pickup requests.</td></tr>}
              {pending.map((pickup) => (
                <tr key={pickup.id}>
                  <td>{pickup.location_name}</td>
                  <td>{pickup.district}</td>
                  <td>{pickup.waste_type}</td>
                  <td>{pickup.urgency}</td>
                  <td><StatusBadge status={pickup.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default AssignPickups;
