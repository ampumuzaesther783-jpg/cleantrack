import { useEffect, useState } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import { adminService } from "../../services/adminService";
import AlertMessage from "../../components/AlertMessage";

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: "", status: "" });
  const [error, setError] = useState("");

  const loadUsers = () => {
    setLoading(true);
    adminService.users().then((response) => setUsers(response.data))
      .catch((requestError) => setError(requestError.response?.data?.message || "Could not load users."))
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, []);

  const updateStatus = async (id, status) => {
    setError("");
    try { await adminService.updateUserStatus(id, status); loadUsers(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Could not update user status."); }
  };

  const filtered = users.filter((user) => (!filters.role || user.role === filters.role) && (!filters.status || user.status === filters.status));

  return (
    <>
      <h1 className="h3">Manage Users</h1>
      <AlertMessage type="danger" message={error} />
      <div className="content-card mb-3">
        <div className="row g-2">
          <div className="col-md-6">
            <select className="form-select" onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
              <option value="">All roles</option><option value="admin">Admin</option><option value="customer">Customer</option><option value="driver">Driver</option><option value="manager">Manager</option>
            </select>
          </div>
          <div className="col-md-6">
            <select className="form-select" onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>
      {loading ? <LoadingSpinner /> : (
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No users match these filters.</td></tr>}
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.status}</td>
                  <td>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => updateStatus(user.id, user.status === "active" ? "inactive" : "active")}>
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default ManageUsers;
