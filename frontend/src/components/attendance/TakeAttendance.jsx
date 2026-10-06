import { useEffect, useMemo, useState } from "react";
import { fetchAttendanceDay, getErrorMessage, saveAttendance } from "../../services/api.js";
import { Empty, ErrorState, Loading } from "../StateMessage.jsx";

const LABS = ["Lab 1", "Lab 2"];
const pretty = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function TakeAttendance({ date, setDate, lab, setLab, onSaved }) {
  const today = new Date().toLocaleDateString("en-CA");
  const [rows, setRows] = useState([]);
  const [marks, setMarks] = useState({});
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "ok" | "error", text }
  const [q, setQ] = useState("");

  const load = () => {
    if (!date) return () => {};
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setMsg(null);
    fetchAttendanceDay(date, lab)
      .then((day) => {
        if (cancelled) return;
        setRows(day.students);
        // New sheet: everyone starts as Present; mark the absentees.
        setMarks(Object.fromEntries(day.students.filter((s) => !s.locked).map((s) => [s.student_id, s.status || "Present"])));
        setAlreadySaved(day.saved);
      })
      .catch((err) => !cancelled && setLoadError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  };
  useEffect(load, [date, lab]); // eslint-disable-line react-hooks/exhaustive-deps

  const editable = rows.filter((s) => !s.locked);
  const present = editable.filter((s) => marks[s.student_id] === "Present").length;
  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((s) => s.name.toLowerCase().includes(t) || s.roll_number.toLowerCase().includes(t)) : rows;
  }, [rows, q]);

  const setAll = (status) => setMarks(Object.fromEntries(editable.map((s) => [s.student_id, status])));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await saveAttendance(date, lab, editable.map((s) => ({ student_id: s.student_id, status: marks[s.student_id] })));
      setAlreadySaved(true);
      setRows(res.students);
      setMsg({ type: "ok", text: `${lab} attendance saved for ${pretty(date)}.` });
      onSaved();
    } catch (err) {
      setMsg({ type: "error", text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <div className="att-toolbar">
        <label className="field att-date">
          <span>Date</span>
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <div className="field att-lab">
          <span>Lab</span>
          <div className="seg seg-lg" role="group" aria-label="Choose lab">
            {LABS.map((l) => (
              <button key={l} type="button" aria-pressed={lab === l}
                      className={`seg-btn seg-filter ${lab === l ? "on" : ""}`} onClick={() => setLab(l)}>{l}</button>
            ))}
          </div>
        </div>
        {editable.length > 0 && (
          <div className="att-count" aria-live="polite">
            <strong>{present}</strong> present · <strong>{editable.length - present}</strong> absent
          </div>
        )}
      </div>

      {loading && <Loading />}
      {loadError && <ErrorState message={loadError} onRetry={load} />}

      {!loading && !loadError && rows.length === 0 && (
        <Empty title={`No students in ${lab}`}>
          Add students to {lab} (or move some here) on the Students page.
        </Empty>
      )}

      {!loading && !loadError && rows.length > 0 && (
        <>
          {alreadySaved
            ? <div className="alert alert-warn">{lab} attendance for {pretty(date)} is already saved. Saving again updates it.</div>
            : <p className="muted small">Everyone starts as Present. Mark the absentees, then save.</p>}

          <div className="att-tools">
            <input className="search" type="search" placeholder="Search name or registration number"
                   value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" />
            <button className="btn btn-ghost btn-sm" onClick={() => setAll("Present")}>All Present</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAll("Absent")}>All Absent</button>
          </div>

          <ul className="att-list">
            {visible.map((s) => (
              <li key={s.student_id} className="att-row">
                <span className="att-roll">{s.roll_number}</span>
                <span className="att-name">
                  {s.name}
                  {s.locked && <em className="att-note">Already marked {s.status} in {s.recorded_lab} on this date</em>}
                  {!s.locked && s.current_lab !== lab && <em className="att-note">Now in {s.current_lab}</em>}
                </span>
                {s.locked ? (
                  <span className={`badge ${s.status === "Present" ? "badge-easy" : "badge-hard"}`}>{s.status}</span>
                ) : (
                  <span className="seg" role="group" aria-label={`Attendance for ${s.name}`}>
                    {["Present", "Absent"].map((st) => (
                      <button key={st} type="button" aria-pressed={marks[s.student_id] === st}
                              className={`seg-btn seg-${st.toLowerCase()} ${marks[s.student_id] === st ? "on" : ""}`}
                              onClick={() => setMarks({ ...marks, [s.student_id]: st })}>
                        {st}
                      </button>
                    ))}
                  </span>
                )}
              </li>
            ))}
            {visible.length === 0 && <li className="muted att-row">No student matches "{q}".</li>}
          </ul>

          {msg && <div className={`alert alert-${msg.type === "ok" ? "ok" : "error"}`} role="status">{msg.type === "ok" ? "✓ " : ""}{msg.text}</div>}
          <button className="btn btn-primary btn-block" onClick={save} disabled={busy || editable.length === 0}>
            {busy ? "Saving…" : alreadySaved ? "Update Attendance" : "Save Attendance"}
          </button>
        </>
      )}
    </div>
  );
}
