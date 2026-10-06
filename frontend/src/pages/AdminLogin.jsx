import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage, getFieldErrors } from "../services/api.js";

export default function AdminLogin() {
  const { login, isAuthenticated, notice, setNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!form.email.trim() || !form.password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from || "/admin", { replace: true });
    } catch (err) {
      const fields = getFieldErrors(err);
      setError(fields.email ? "Enter a valid email address." : getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page-top narrow">
      <form className="panel" onSubmit={submit} noValidate>
        <h2>CSI Admin Portal</h2>
        <p className="muted">For CSI EBMs and admins only.</p>
        {notice && <div className="alert alert-warn" role="alert">{notice}</div>}
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="username" value={form.email}
                 onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" value={form.password}
                 onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Logging in…" : "Login"}
        </button>
      </form>
    </div>
  );
}
