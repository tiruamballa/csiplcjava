import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const close = () => setOpen(false);

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" onClick={close}>
            <span className="brand-name">🚀 Java for Problem Solving Skills</span>
            <span className="brand-sub">CSI | Computer Society of India</span>
          </Link>
          <button className="nav-toggle" aria-label="Toggle menu" aria-expanded={open}
                  onClick={() => setOpen((o) => !o)}>
            <span /><span /><span />
          </button>
          <nav className={`nav-links ${open ? "open" : ""}`}>
            <NavLink to="/" end onClick={close}>Home</NavLink>
            <NavLink to="/today" onClick={close}>Today's Assignments</NavLink>
            <NavLink to="/previous" onClick={close}>Previous Assignments</NavLink>
            {isAuthenticated && (
              <NavLink to="/admin" className="nav-admin" onClick={close}>Admin Dashboard</NavLink>
            )}
          </nav>
        </div>
      </header>

      <main key={pathname}><Outlet /></main>

      <footer className="footer">
        <div className="container footer-inner">
          <p>🚀 Java for Problem Solving Skills · CSI | Computer Society of India</p>
          <Link to="/admin/login" className="footer-admin">Admin</Link>
        </div>
      </footer>
    </>
  );
}