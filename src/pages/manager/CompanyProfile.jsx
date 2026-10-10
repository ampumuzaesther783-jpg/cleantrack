import { useEffect, useState } from "react";
import AlertMessage from "../../components/AlertMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import { companyService } from "../../services/companyService";

const emptyCompany = { company_name: "", phone: "", email: "", district: "", address: "" };

const CompanyProfile = () => {
  const [company, setCompany] = useState(emptyCompany);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    companyService.myCompany()
      .then((response) => setCompany(response.data))
      .catch((requestError) => {
        if (requestError.response?.status === 404) setCompany(emptyCompany);
        else setError(requestError.response?.data?.message || "Could not load company profile.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (event) => setCompany({ ...company, [event.target.name]: event.target.value });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      if (company.id) {
        await companyService.update(company.id, company);
      } else {
        const response = await companyService.create(company);
        setCompany({ ...company, id: response.data.id });
      }
      setMessage("Company profile saved.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not save company");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="content-card">
      <h1 className="h3">Company Profile</h1>
      <AlertMessage type={message.includes("Could") ? "danger" : "success"} message={message} />
      <AlertMessage type="danger" message={error} />
      <form className="row g-3" onSubmit={handleSubmit}>
        {["company_name", "phone", "email", "district"].map((field) => (
          <div className="col-md-6" key={field}>
            <label className="form-label text-capitalize">{field.replaceAll("_", " ")}</label>
            <input className="form-control" name={field} value={company[field] || ""} onChange={handleChange} required={field === "company_name" || field === "district"} />
          </div>
        ))}
        <div className="col-12">
          <label className="form-label">Address</label>
          <textarea className="form-control" name="address" value={company.address || ""} onChange={handleChange}></textarea>
        </div>
        <div className="col-12"><button className="btn btn-cleantrack">Save Company</button></div>
      </form>
    </div>
  );
};

export default CompanyProfile;
