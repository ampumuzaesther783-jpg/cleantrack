import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner text="Checking your session..." />;

  // Protected routes redirect visitors who have no valid JWT-backed session.
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
