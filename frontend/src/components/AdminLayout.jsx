import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const LINKS = [
  ["/admin", "Dashboard", true],
  ["/admin/assignments", "Questions"],
  ["/admin/students", "Students"],
  ["/admin/attendance", "Attendance"],
  ["/admin/report", "Attendance Report"],
];

/** Wraps every admin page with the section menu (scrolls sideways on small phones). */
export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="container admin-shell">
      <nav className="admin-nav" aria-label="Admin sections">
        {LINKS.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end} className="admin-tab">{label}</NavLink>
        ))}
        <button className="admin-tab admin-logout" onClick={() => { logout(); navigate("/admin/login"); }}>
          Logout
        </button>
      </nav>
      <Outlet />
    </div>
  );
}
