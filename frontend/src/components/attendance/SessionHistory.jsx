import { useMemo, useState } from "react";
import useFetch from "../../hooks/useFetch.js";
import { deleteAttendanceDay, fetchSessions, getErrorMessage } from "../../services/api.js";
import ConfirmDialog from "../ConfirmDialog.jsx";
import LabBadge from "../LabBadge.jsx";
import { ErrorState, Loading } from "../StateMessage.jsx";

const pretty = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** "Attendance Sessions": every date, with one line per lab. Open to edit, or delete a wrong one. */
export default function SessionHistory({ refreshKey, onChanged, onOpen }) {
  const { data, loading, error, reload } = useFetch(fetchSessions, [refreshKey]);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const byDate = useMemo(() => {
    const map = new Map();
    (data || []).forEach((s) => map.set(s.session_date, [...(map.get(s.session_date) || []), s]));
    return [...map.entries()];
  }, [data]);

  const remove = async () => {
    setBusy(true); setErr("");
    try {
      await deleteAttendanceDay(toDelete.session_date, toDelete.lab);
      setToDelete(null);
      reload();
      onChanged();
    } catch (e) { setErr(getErrorMessage(e)); setToDelete(null); } finally { setBusy(false); }
  };

  return (
    <div className="panel">
      <h3>Attendance Sessions</h3>
      {err && <div className="alert alert-error" role="alert">{err}</div>}
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data?.length === 0 && <p className="muted">No attendance taken yet.</p>}
      {byDate.map(([date, list]) => (
        <div className="session-day" key={date}>
          <h4>{pretty(date)}</h4>
          {list.map((s) => (
            <div className="session-line" key={s.lab}>
              <LabBadge lab={s.lab} />
              <span className="session-counts">{s.present} Present / {s.absent} Absent</span>
              <span className="row-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => onOpen(s.session_date, s.lab)}>Open / Edit</button>
                <button className="btn btn-danger-ghost btn-sm" onClick={() => setToDelete(s)}>Delete</button>
              </span>
            </div>
          ))}
        </div>
      ))}
      {toDelete && (
        <ConfirmDialog
          title="Delete this attendance session?"
          message={`${toDelete.lab} attendance for ${pretty(toDelete.session_date)} (${toDelete.present} present, ${toDelete.absent} absent) will be removed and percentages recalculated. Other labs on that date are not affected. This can't be undone.`}
          busy={busy} onConfirm={remove} onCancel={() => !busy && setToDelete(null)}
        />
      )}
    </div>
  );
}
