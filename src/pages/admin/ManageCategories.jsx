import { useEffect, useState } from "react";
import AlertMessage from "../../components/AlertMessage";
import LoadingSpinner from "../../components/LoadingSpinner";
import { categoryService } from "../../services/categoryService";

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", status: "active" });

  const loadCategories = () => {
    setLoading(true);
    categoryService.list().then((response) => setCategories(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load categories."))
      .finally(() => setLoading(false));
  };

  useEffect(loadCategories, []);

  const saveCategory = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await categoryService.create(form);
      setForm({ name: "", description: "", status: "active" });
      setMessage("Category saved.");
      loadCategories();
    } catch (requestError) { setError(requestError.response?.data?.message || "Could not save category."); }
  };

  return (
    <>
      <div className="content-card mb-3">
        <h1 className="h3">Manage Waste Categories</h1>
        <AlertMessage type="success" message={message} />
        <AlertMessage type="danger" message={error} />
        <form className="row g-2" onSubmit={saveCategory}>
          <div className="col-md-3"><input className="form-control" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="col-md-5"><input className="form-control" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="col-md-2">
            <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-md-2"><button className="btn btn-cleantrack w-100">Add</button></div>
        </form>
      </div>
      {loading ? <LoadingSpinner /> : (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Name</th><th>Description</th><th>Status</th></tr></thead>
            <tbody>
              {categories.length === 0 && <tr><td colSpan="3" className="text-center text-muted py-4">No waste categories are available.</td></tr>}
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{category.description}</td>
                  <td>{category.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default ManageCategories;
