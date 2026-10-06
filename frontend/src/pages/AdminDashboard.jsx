import { Link } from "react-router-dom";
import DifficultyBadge from "../components/DifficultyBadge.jsx";
import { ErrorState, Loading } from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import useFetch from "../hooks/useFetch.js";
import { fetchAdminAssignments, fetchOverview } from "../services/api.js";

export default function AdminDashboard() {
  const { admin } = useAuth();
  const q = useFetch(fetchAdminAssignments);
  const o = useFetch(fetchOverview);

  const data = q.data;
  const days = data ? new Set(data.map((a) => a.day_number)).size : 0;
  const recent = data ? [...data].sort((a, b) => b.id - a.id).slice(0, 5) : [];

  return (
    <div className="admin-page">
      <div className="section-head"><h2>Dashboard</h2></div>
      <p className="welcome">Welcome, {admin?.name || "Admin"}</p>

      <div className="actions">
        <Link to="/admin/assignments/new" className="btn btn-primary">+ Add Question</Link>
        <Link to="/admin/attendance" className="btn btn-dark">Take Attendance</Link>
        <Link to="/admin/students" className="btn btn-dark">Students</Link>
        <Link to="/admin/report" className="btn btn-ghost">Attendance Report</Link>
      </div>

      {o.error && <ErrorState message={o.error} onRetry={o.reload} />}
      {o.data && (
        <div className="stats stats-4">
          <div className="stat"><strong>{o.data.total}</strong><span>Total students</span></div>
          <div className="stat"><strong>{o.data.lab1}</strong><span>Lab 1</span></div>
          <div className="stat"><strong>{o.data.lab2}</strong><span>Lab 2</span></div>
          <div className="stat"><strong>{o.data.sessions}</strong><span>Attendance days</span></div>
        </div>
      )}

      {q.loading && <Loading />}
      {q.error && <ErrorState message={q.error} onRetry={q.reload} />}
      {data && (
        <div className="panel">
          <h3>{data.length} questions across {days} {days === 1 ? "day" : "days"}</h3>
          {recent.length > 0 && <p className="muted">Most recently added</p>}
          <ul className="recent">
            {recent.map((a) => (
              <li key={a.id}>
                <span>Day {a.day_number} · {a.title}</span>
                <DifficultyBadge level={a.difficulty} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
