import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  // On mount: if a token exists, validate it against /auth/me
  // and restore the user session instead of forcing re-login.
  useEffect(() => {
    async function restoreSession() {
      const savedToken = localStorage.getItem("token");
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
        setToken(savedToken);
      } catch (err) {
        // token invalid/expired — clear it
        localStorage.removeItem("token");
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    const { access_token } = res.data;

    localStorage.setItem("token", access_token);
    setToken(access_token);

    // fetch full user profile now that we're authenticated
    const meRes = await api.get("/auth/me");
    setUser(meRes.data);

    return meRes.data; // caller can use this to redirect by role
  }

  async function register(email, password, role) {
  const res = await api.post("/auth/register", {
    email,
    password,
    role,
  });

  return res.data;
}

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
  value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}