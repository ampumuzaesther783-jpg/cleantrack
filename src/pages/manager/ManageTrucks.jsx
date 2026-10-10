import { useEffect, useState } from "react";
import AlertMessage from "../../components/AlertMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import { truckService } from "../../services/truckService";

const emptyTruck = { truck_number_plate: "", truck_capacity: "", driver_id: "", status: "active" };

const ManageTrucks = () => {
  const [trucks, setTrucks] = useState([]);
  const [form, setForm] = useState(emptyTruck);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTrucks = () => {
    setLoading(true);
    truckService.companyTrucks().then((response) => setTrucks(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load trucks."))
      .finally(() => setLoading(false));
  };

  useEffect(loadTrucks, []);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const saveTruck = async (event) => {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try {
      await truckService.create(form);
      setForm(emptyTruck);
      setMessage("Truck saved.");
      loadTrucks();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not save truck.");
    } finally { setSaving(false); }
  };

  const deleteTruck = async (id) => {
    if (!window.confirm("Delete this truck?")) return;
    setError("");
    try { await truckService.remove(id); setMessage("Truck deleted."); loadTrucks(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not delete truck."); }
  };

  return (
    <>
      <div className="content-card mb-3">
        <h1 className="h3">Manage Trucks</h1>
        <AlertMessage type="success" message={message} />
        <AlertMessage type="danger" message={error} />
        <form className="row g-2" onSubmit={saveTruck}>
          <div className="col-md-3"><input className="form-control" name="truck_number_plate" placeholder="Number plate" value={form.truck_number_plate} onChange={handleChange} required /></div>
          <div className="col-md-3"><input className="form-control" name="truck_capacity" placeholder="Capacity" value={form.truck_capacity} onChange={handleChange} /></div>
          <div className="col-md-3"><input className="form-control" name="driver_id" placeholder="Driver user ID" value={form.driver_id} onChange={handleChange} /></div>
          <div className="col-md-2">
            <select className="form-select" name="status" value={form.status} onChange={handleChange}>
              <option value="active">Active</option><option value="maintenance">Maintenance</option><option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-md-1"><button className="btn btn-cleantrack w-100" disabled={saving}>{saving ? "Saving" : "Add"}</button></div>
        </form>
      </div>
      {loading ? <LoadingSpinner /> : (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Plate</th><th>Capacity</th><th>Driver</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {trucks.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No trucks have been added.</td></tr>}
              {trucks.map((truck) => (
                <tr key={truck.id}>
                  <td>{truck.truck_number_plate}</td>
                  <td>{truck.truck_capacity || "Not set"}</td>
                  <td>{truck.driver_name || truck.driver_id || "Unassigned"}</td>
                  <td>{truck.status}</td>
                  <td><button className="btn btn-outline-danger btn-sm" onClick={() => deleteTruck(truck.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default ManageTrucks;
