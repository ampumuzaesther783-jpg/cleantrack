import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { adminService } from "../../services/adminService";
import AlertMessage from "../../components/AlertMessage";

const ManageCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([adminService.companies(), adminService.trucks()])
      .then(([companyResponse, truckResponse]) => {
        setCompanies(companyResponse.data);
        setTrucks(truckResponse.data);
      })
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load companies and trucks."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <h1 className="h3">Companies and Trucks</h1>
      <AlertMessage type="danger" message={error} />
      <div className="row g-3 mb-4">
        {companies.map((company) => (
          <div className="col-md-6 col-xl-4" key={company.id}>
            <div className="content-card h-100">
              <h2 className="h5">{company.company_name}</h2>
              <p className="mb-1 text-muted">{company.district}</p>
              <p className="mb-1">Manager: {company.manager_name}</p>
              <p className="mb-0">Status: {company.status}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead><tr><th>Truck</th><th>Company</th><th>Driver</th><th>Capacity</th><th>Status</th></tr></thead>
          <tbody>
            {trucks.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No company trucks are available.</td></tr>}
            {trucks.map((truck) => (
              <tr key={truck.id}>
                <td>{truck.truck_number_plate}</td>
                <td>{truck.company_name}</td>
                <td>{truck.driver_name || "Unassigned"}</td>
                <td>{truck.truck_capacity || "Not set"}</td>
                <td>{truck.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ManageCompanies;
