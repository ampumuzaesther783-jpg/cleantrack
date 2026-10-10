import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AlertMessage from "../../components/AlertMessage";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role: "customer"
  });
  const [message, setMessage] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setPendingMessage("");

    try {
      const result = await register(form);
      if (result.pendingApproval) {
        setPendingMessage(result.message);
        setForm({ ...form, password: "" });
        return;
      }
      navigate("/customer");
    } catch (error) {
      setMessage(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-6">
          <div className="content-card">
            <h1 className="h3">Create Account</h1>
            <AlertMessage type="danger" message={message} />
            <AlertMessage type="success" message={pendingMessage} />
            <form onSubmit={handleSubmit}>
              <label className="form-label mt-3">Full name</label>
              <input className="form-control" name="full_name" value={form.full_name} onChange={handleChange} required />
              <label className="form-label mt-3">Email</label>
              <input className="form-control" type="email" name="email" value={form.email} onChange={handleChange} required />
              <label className="form-label mt-3">Phone</label>
              <input className="form-control" name="phone" value={form.phone} onChange={handleChange} />
              <label className="form-label mt-3">Account type</label>
              <select className="form-select" name="role" value={form.role} onChange={handleChange}>
                <option value="customer">Resident/Customer</option>
                <option value="driver">Driver/Collector</option>
                <option value="manager">Waste Company Manager</option>
              </select>
              {form.role !== "customer" && <small className="form-text">Staff accounts require administrator activation before sign-in.</small>}
              <label className="form-label mt-3">Password</label>
              <input className="form-control" type="password" name="password" minLength="8" maxLength="72" value={form.password} onChange={handleChange} required />
              <button className="btn btn-cleantrack w-100 mt-4">Register</button>
            </form>
            <p className="mt-3 mb-0">Already have an account? <Link to="/login">Login</Link></p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Register;
