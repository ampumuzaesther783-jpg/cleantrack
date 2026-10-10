import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AlertMessage from "../../components/AlertMessage";
import { categoryService } from "../../services/categoryService";
import { locationService } from "../../services/locationService";
import { pickupService } from "../../services/pickupService";

const ReportFullBin = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    location_id: "",
    waste_category_id: "",
    description: "",
    urgency: "normal",
    estimated_bin_level: 80,
    photo: null
  });

  useEffect(() => {
    Promise.all([locationService.myLocations(), categoryService.list()])
      .then(([locationResponse, categoryResponse]) => {
        setLocations(locationResponse.data);
        setCategories(categoryResponse.data.filter((item) => item.status === "active"));
      })
      .catch((error) => setMessage(error.response?.data?.message || "Could not load locations and waste categories."))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (event) => {
    const { name, value, files } = event.target;
    setForm({ ...form, [name]: files ? files[0] : value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setSaving(true);

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value) data.append(key, value);
    });

    try {
      // FormData is used here because the pickup report can include a photo upload.
      await pickupService.create(data);
      navigate("/customer/pickups");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not report full bin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content-card">
      <h1 className="h3">Report Full Bin</h1>
      <AlertMessage type="danger" message={message} />
      {loading ? <LoadingSpinner text="Loading pickup options..." /> : (
      locations.length === 0 ? <p className="mb-0">Add a pickup location before reporting a bin.</p> : categories.length === 0 ? <p className="mb-0">No active waste categories are available right now.</p> : (
      <form className="row g-3" onSubmit={handleSubmit}>
        <div className="col-md-6">
          <label className="form-label">Location</label>
          <select className="form-select" name="location_id" value={form.location_id} onChange={handleChange} required>
            <option value="">Select location</option>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.location_name}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Waste type</label>
          <select className="form-select" name="waste_category_id" value={form.waste_category_id} onChange={handleChange} required>
            <option value="">Select waste type</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Urgency</label>
          <select className="form-select" name="urgency" value={form.urgency} onChange={handleChange}>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Estimated bin level (%)</label>
          <input className="form-control" type="number" min="1" max="100" name="estimated_bin_level" value={form.estimated_bin_level} onChange={handleChange} required />
        </div>
        <div className="col-12">
          <label className="form-label">Description</label>
          <textarea className="form-control" name="description" value={form.description} onChange={handleChange}></textarea>
        </div>
        <div className="col-12">
          <label className="form-label">Photo</label>
          <input className="form-control" type="file" name="photo" accept="image/*" onChange={handleChange} />
        </div>
        <div className="col-12">
          <button className="btn btn-cleantrack" disabled={saving || !locations.length || !categories.length}>{saving ? "Submitting..." : "Submit Pickup Request"}</button>
        </div>
      </form>
      )
      )}
    </div>
  );
};

export default ReportFullBin;
