import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../services/api.js";

export default function AdminLogin() {
  const { login, isAuthenticated, notice, setNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!password) {
      setError("Please enter the admin password.");
      return;
    }
    setBusy(true);
    try {
      await login(password);
      navigate(location.state?.from || "/admin", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page-top narrow">
      <form className="panel" onSubmit={submit} noValidate>
        <h2>CSI Admin Portal</h2>
        <p className="muted">Enter password to access Admin Panel.</p>
        {notice && <div className="alert alert-warn" role="alert">{notice}</div>}
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Logging in…" : "Login"}
        </button>
      </form>
    </div>
  );
}
