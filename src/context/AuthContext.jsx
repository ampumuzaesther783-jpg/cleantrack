import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cleantrack_token");

    if (!token) {
      setLoading(false);
      return;
    }

    // AuthContext loads the current user once so every page can know who is logged in.
    authService
      .me()
      .then((response) => setUser(response.data.user))
      .catch(() => localStorage.removeItem("cleantrack_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    localStorage.setItem("cleantrack_token", response.data.token);
    setUser(response.data.user);
    return response.data.user;
  };

  const register = async (form) => {
    const response = await authService.register(form);
    if (response.data.pendingApproval) return response.data;
    localStorage.setItem("cleantrack_token", response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("cleantrack_token");
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
