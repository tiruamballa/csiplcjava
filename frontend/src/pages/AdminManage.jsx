import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import DifficultyBadge from "../components/DifficultyBadge.jsx";
import { Empty, ErrorState, Loading } from "../components/StateMessage.jsx";
import useFetch from "../hooks/useFetch.js";
import { deleteAssignment, fetchAdminAssignments, getErrorMessage } from "../services/api.js";

const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

export default function AdminManage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, loading, error, reload } = useFetch(fetchAdminAssignments);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(location.state?.flash || "");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("all");
  const [show, setShow] = useState("all"); // all | live | scheduled

  const confirmDelete = async () => {
    setBusy(true);
    setActionError("");
    try {
      await deleteAssignment(toDelete.id);
      setFlash(`"${toDelete.title}" was deleted.`);
      setToDelete(null);
      reload();
    } catch (err) {
      setActionError(getErrorMessage(err));
      setToDelete(null);
    } finally {
      setBusy(false);
    }
  };

  const allDays = useMemo(
    () => [...new Set((data || []).map((a) => a.day_number))].sort((a, b) => b - a), [data]
  );
  const filtered = (data || []).filter((a) => {
    const t = search.trim().toLowerCase();
    if (t && !a.title.toLowerCase().includes(t) && !a.description.toLowerCase().includes(t)) return false;
    if (dayFilter !== "all" && String(a.day_number) !== dayFilter) return false;
    if (show === "scheduled" && a.assignment_date <= todayStr()) return false;
    if (show === "live" && a.assignment_date > todayStr()) return false;
    return true;
  });

  const groups = [];
  filtered.forEach((a) => {
    let g = groups.find((x) => x.day === a.day_number);
    if (!g) groups.push((g = { day: a.day_number, date: a.assignment_date, items: [] }));
    g.items.push(a);
  });

  return (
    <div className="admin-page">
      <div className="section-head">
        <h2>Questions</h2>
        <Link to="/admin/assignments/new" className="btn btn-primary">+ Add Question</Link>
      </div>

      {data && data.length > 0 && (
        <div className="att-tools">
          <input className="search" type="search" placeholder="Search questions" value={search}
                 onChange={(e) => setSearch(e.target.value)} aria-label="Search questions" />
          <select className="select" value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} aria-label="Filter by day">
            <option value="all">All days</option>
            {allDays.map((d) => <option key={d} value={d}>Day {d}</option>)}
          </select>
          <select className="select" value={show} onChange={(e) => setShow(e.target.value)} aria-label="Filter by status">
            <option value="all">Live + scheduled</option>
            <option value="live">Live now</option>
            <option value="scheduled">Scheduled (future)</option>
          </select>
        </div>
      )}

      {flash && <div className="alert alert-ok" role="status">✓ {flash}</div>}
      {actionError && <div className="alert alert-error" role="alert">{actionError}</div>}
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && groups.length === 0 && (
        <Empty title="No questions yet">Click “+ Add Question” to add the first one.</Empty>
      )}

      {data && data.length > 0 && groups.length === 0 && (
        <Empty title="No questions match">Try a different search or filter.</Empty>
      )}

      {groups.map((g) => (
        <section className="panel manage-day" key={g.day}>
          <h3>
            Day {g.day}
            <span className="muted"> · {g.date}</span>
            {g.date > todayStr() && <span className="badge badge-scheduled">Scheduled</span>}
          </h3>
          <ol>
            {g.items.map((a) => (
              <li key={a.id}>
                <span className="manage-title">{a.title}</span>
                <DifficultyBadge level={a.difficulty} />
                <span className="row-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/assignments/${a.id}/edit`)}>Edit</button>
                  <button className="btn btn-danger-ghost btn-sm" onClick={() => setToDelete(a)}>Delete</button>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {toDelete && (
        <ConfirmDialog
          title="Delete this question?"
          message={`"${toDelete.title}" (Day ${toDelete.day_number}) will be removed from the website. This can't be undone.`}
          busy={busy}
          onConfirm={confirmDelete}
          onCancel={() => !busy && setToDelete(null)}
        />
      )}
    </div>
  );
}
