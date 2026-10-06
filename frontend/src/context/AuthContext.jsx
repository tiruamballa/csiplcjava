import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { TOKEN_KEY, fetchMe, loginAdmin } from "../services/api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(!!localStorage.getItem(TOKEN_KEY));
  const [notice, setNotice] = useState("");

  // On page load, confirm any stored token is still valid.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    fetchMe()
      .then(setAdmin)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // The API layer fires this when the JWT has expired or is invalid.
  useEffect(() => {
    const onExpired = (e) => {
      setAdmin(null);
      setNotice(e.detail || "Your session has expired. Please log in again.");
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await loginAdmin(email, password);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setNotice("");
    setAdmin(data.admin);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ admin, checking, isAuthenticated: !!admin, login, logout, notice, setNotice }}
    >
      {children}
    </AuthContext.Provider>
  );
}
