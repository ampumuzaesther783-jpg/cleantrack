import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { locationService } from "../../services/locationService";
import AlertMessage from "../../components/AlertMessage";

const AddLocation = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    location_name: "",
    location_type: "home",
    district: "",
    division_or_subcounty: "",
    parish: "",
    village_or_zone: "",
    address_details: "",
    latitude: "",
    longitude: ""
  });

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      // This form sends simple JSON to the backend location controller.
      await locationService.create(form);
      navigate("/customer/locations");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not save location");
    }
  };

  return (
    <div className="content-card">
      <h1 className="h3">Add Location</h1>
      <AlertMessage type="danger" message={message} />
      <form className="row g-3" onSubmit={handleSubmit}>
        <div className="col-md-6">
          <label className="form-label">Location name</label>
          <input className="form-control" name="location_name" value={form.location_name} onChange={handleChange} required />
        </div>
        <div className="col-md-6">
          <label className="form-label">Location type</label>
          <select className="form-select" name="location_type" value={form.location_type} onChange={handleChange}>
            <option value="home">Home</option>
            <option value="business">Business</option>
            <option value="school">School</option>
            <option value="market_stall">Market stall</option>
            <option value="institution">Institution</option>
          </select>
        </div>
        {["district", "division_or_subcounty", "parish", "village_or_zone"].map((field) => (
          <div className="col-md-6" key={field}>
            <label className="form-label text-capitalize">{field.replaceAll("_", " ")}</label>
            <input className="form-control" name={field} value={form[field]} onChange={handleChange} required={field === "district"} />
          </div>
        ))}
        <div className="col-12">
          <label className="form-label">Address details</label>
          <textarea className="form-control" name="address_details" value={form.address_details} onChange={handleChange}></textarea>
        </div>
        <div className="col-md-6">
          <label className="form-label">Latitude</label>
          <input className="form-control" name="latitude" value={form.latitude} onChange={handleChange} />
        </div>
        <div className="col-md-6">
          <label className="form-label">Longitude</label>
          <input className="form-control" name="longitude" value={form.longitude} onChange={handleChange} />
        </div>
        <div className="col-12">
          <button className="btn btn-cleantrack">Save Location</button>
        </div>
      </form>
    </div>
  );
};

export default AddLocation;
