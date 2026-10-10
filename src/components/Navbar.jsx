import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Recycle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const roleHome = {
  admin: "/admin",
  customer: "/customer",
  driver: "/driver",
  manager: "/manager"
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to={user ? roleHome[user.role] : "/"}>
          <Recycle size={22} />
          CleanTrack Uganda
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="mainNavbar">
          <div className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
            {!user && (
              <>
                <NavLink className="nav-link" to="/">Home</NavLink>
                <NavLink className="nav-link" to="/about">About</NavLink>
                <NavLink className="nav-link" to="/how-it-works">How It Works</NavLink>
                <NavLink className="btn btn-outline-success ms-lg-2" to="/login">Login</NavLink>
                <NavLink className="btn btn-cleantrack" to="/register">Register</NavLink>
              </>
            )}
            {user && (
              <>
                <NotificationBell role={user.role} />
                <span className="text-muted small me-lg-2">{user.full_name} · {user.role}</span>
                <button className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1" onClick={handleLogout}>
                  <LogOut size={16} />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
