import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { locationService } from "../../services/locationService";
import AlertMessage from "../../components/AlertMessage";
import LoadingSpinner from "../../components/LoadingSpinner";

const MyLocations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadLocations = async () => {
    setLoading(true);
    setError("");
    try { setLocations((await locationService.myLocations()).data); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not load locations."); }
    finally { setLoading(false); }
  };

  useEffect(loadLocations, []);

  const removeLocation = async (id) => {
    if (!window.confirm("Delete this location?")) return;
    setError("");
    try { await locationService.remove(id); setMessage("Location deleted."); await loadLocations(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not delete this location."); }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">My Locations</h1>
        <Link className="btn btn-cleantrack" to="/customer/locations/new">Add Location</Link>
      </div>
      <AlertMessage type="success" message={message} />
      <AlertMessage type="danger" message={error} />
      {loading ? <LoadingSpinner /> : (
        locations.length === 0 ? <div className="content-card">You have not added any pickup locations yet.</div> : <div className="row g-3">
          {locations.map((location) => (
            <div className="col-md-6 col-xl-4" key={location.id}>
              <div className="content-card h-100">
                <h2 className="h5">{location.location_name}</h2>
                <p className="text-muted mb-1">{location.location_type} · {location.district}</p>
                <p>{location.address_details || "No extra address details."}</p>
                <button className="btn btn-outline-danger btn-sm" onClick={() => removeLocation(location.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default MyLocations;
