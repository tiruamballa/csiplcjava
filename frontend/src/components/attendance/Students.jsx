import { useMemo, useState } from "react";
import useFetch from "../../hooks/useFetch.js";
import {
  addStudent, addStudentsBulk, changeStudentLab, deleteStudent, fetchStudents, getErrorMessage,
  getFieldErrors, updateStudent,
} from "../../services/api.js";
import ConfirmDialog from "../ConfirmDialog.jsx";
import LabBadge from "../LabBadge.jsx";
import { Empty, ErrorState, Loading } from "../StateMessage.jsx";

const natural = (a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true });
const LABS = ["Lab 1", "Lab 2"];

/**
 * One line per student. Accepted formats (comma, tab or space between the parts):
 *   25B91A1234, Student Name
 *   25B91A1234, Student Name, Lab 2        (lab is optional - the "Lab" box above is used if left out)
 */
function parseLines(text, defaultLab) {
  const students = [], bad = [];
  text.split("\n").map((l) => l.trim()).filter(Boolean).forEach((line) => {
    const parts = line.split(/\s*[,\t]\s*/).filter(Boolean);
    let reg, name, lab = defaultLab;
    if (parts.length >= 2) {
      reg = parts[0];
      const last = parts[parts.length - 1];
      if (parts.length >= 3 && /^lab\s*[12]$/i.test(last)) {
        lab = "Lab " + last.replace(/\D/g, "");
        name = parts.slice(1, -1).join(" ");
      } else name = parts.slice(1).join(" ");
    } else {
      const m = line.match(/^(\S+)\s+(.+)$/);
      if (m) { reg = m[1]; name = m[2]; }
    }
    if (reg && name) students.push({ roll_number: reg, name, lab });
    else bad.push(line);
  });
  return { students, bad };
}

export default function Students({ onChanged = () => {} }) {
  const { data, loading, error, reload } = useFetch(fetchStudents);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [one, setOne] = useState({ roll_number: "", name: "", lab: "Lab 1" });
  const [bulk, setBulk] = useState("");
  const [bulkLab, setBulkLab] = useState("Lab 1");
  const [msg, setMsg] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null); // { id, roll_number, name, lab }
  const [toDelete, setToDelete] = useState(null);
  const [toMove, setToMove] = useState(null); // student being moved

  const all = useMemo(() => [...(data || [])].sort(natural), [data]);
  // Counts are calculated from the database rows, never hard-coded.
  const counts = useMemo(() => ({
    all: all.length,
    "Lab 1": all.filter((s) => s.lab === "Lab 1").length,
    "Lab 2": all.filter((s) => s.lab === "Lab 2").length,
  }), [all]);
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter((s) =>
      (filter === "All" || s.lab === filter) &&
      (!t || s.name.toLowerCase().includes(t) || s.roll_number.toLowerCase().includes(t)));
  }, [all, filter, q]);

  const done = (text) => { setMsg({ type: "ok", text }); reload(); onChanged(); };
  const fail = (err) => { setFieldErrors(getFieldErrors(err)); setMsg({ type: "error", text: getErrorMessage(err) }); };

  const addOne = async (e) => {
    e.preventDefault();
    setMsg(null); setFieldErrors({}); setBusy(true);
    try {
      await addStudent(one);
      setOne({ ...one, roll_number: "", name: "" });
      done(`${one.name.trim()} was added to ${one.lab}.`);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const addMany = async () => {
    setMsg(null);
    const { students: list, bad } = parseLines(bulk, bulkLab);
    if (bad.length) return setMsg({ type: "error", text: `Each line needs a registration number and a name. Check: "${bad[0]}"` });
    if (!list.length) return setMsg({ type: "error", text: "Paste at least one student." });
    setBusy(true);
    try {
      const r = await addStudentsBulk(list);
      setBulk("");
      const extra = [];
      if (r.skipped.length) extra.push(`Already existed (skipped): ${r.skipped.join(", ")}.`);
      if (r.rejected.length) extra.push(`Not added: ${r.rejected.map((x) => `${x.roll_number} (${x.reason})`).join("; ")}.`);
      done(`${r.created} student${r.created === 1 ? "" : "s"} added. ${extra.join(" ")}`.trim());
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const saveEdit = async () => {
    setMsg(null); setBusy(true);
    try {
      await updateStudent(edit.id, { roll_number: edit.roll_number, name: edit.name, lab: edit.lab });
      setEdit(null);
      done("Student updated.");
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const moveLab = async () => {
    const target = toMove.lab === "Lab 1" ? "Lab 2" : "Lab 1";
    setBusy(true); setMsg(null);
    try {
      await changeStudentLab(toMove.id, target);
      done(`${toMove.name} is now in ${target}. Their attendance history is unchanged.`);
    } catch (err) { fail(err); } finally { setToMove(null); setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteStudent(toDelete.id);
      done(`${toDelete.name} was removed.`);
    } catch (err) { fail(err); } finally { setToDelete(null); setBusy(false); }
  };

  return (
    <>
      {msg && <div className={`alert alert-${msg.type === "ok" ? "ok" : "error"}`} role="status">{msg.type === "ok" ? "✓ " : ""}{msg.text}</div>}

      <div className="stats">
        <div className="stat"><strong>{counts.all}</strong><span>Total Students</span></div>
        <div className="stat"><strong>{counts["Lab 1"]}</strong><span>Lab 1</span></div>
        <div className="stat"><strong>{counts["Lab 2"]}</strong><span>Lab 2</span></div>
      </div>

      <div className="panel">
        <h3>Add a student</h3>
        <form className="field-row wrap" onSubmit={addOne} noValidate>
          <label className="field"><span>Registration No</span>
            <input value={one.roll_number} onChange={(e) => setOne({ ...one, roll_number: e.target.value })} />
            {fieldErrors.roll_number && <em className="field-error">{fieldErrors.roll_number}</em>}
          </label>
          <label className="field"><span>Name</span>
            <input value={one.name} onChange={(e) => setOne({ ...one, name: e.target.value })} />
            {fieldErrors.name && <em className="field-error">{fieldErrors.name}</em>}
          </label>
          <label className="field field-lab"><span>Lab</span>
            <select value={one.lab} onChange={(e) => setOne({ ...one, lab: e.target.value })}>
              {LABS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <button className="btn btn-primary field-btn" disabled={busy}>Add Student</button>
        </form>

        <details className="bulk">
          <summary>Add many students at once</summary>
          <p className="muted small">
            One student per line: registration number, then name. Example: <code>25B91A1234, Student Name</code>.
            To put a line in a specific lab add it at the end: <code>25B91A1234, Student Name, Lab 2</code>.
            You can paste straight from Excel.
          </p>
          <label className="inline bulk-lab">Lab for lines without a lab
            <select value={bulkLab} onChange={(e) => setBulkLab(e.target.value)}>
              {LABS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <textarea rows={6} value={bulk} onChange={(e) => setBulk(e.target.value)}
                    placeholder={"25B91A1234, Student Name\n25B91A1235, Another Student"} />
          <button className="btn btn-dark" onClick={addMany} disabled={busy}>Add Students</button>
        </details>
      </div>

      <div className="panel">
        <div className="att-tools no-top">
          <div className="seg" role="group" aria-label="Filter by lab">
            {["All", ...LABS].map((f) => (
              <button key={f} type="button" aria-pressed={filter === f}
                      className={`seg-btn seg-filter ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
                {f}{" "}<span className="seg-count">{f === "All" ? counts.all : counts[f]}</span>
              </button>
            ))}
          </div>
          <input className="search" type="search" placeholder="Search name or registration number"
                 value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" />
        </div>

        {loading && <Loading />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && all.length === 0 && <Empty title="No students yet">Add your first student above.</Empty>}
        {data && all.length > 0 && rows.length === 0 && <Empty title="No students match">Try a different search or lab filter.</Empty>}

        {rows.length > 0 && (
          <table className="table stack-table">
            <thead><tr><th>PLC Roll No</th><th>Registration No</th><th>Name</th><th>Lab</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  {edit?.id === s.id ? (
                    <>
                      <td data-label="PLC Roll No" className="mono"><span className="plc-roll-badge">{s.plc_roll_number}</span></td>
                      <td data-label="Registration No">
                        <input className="mini full" value={edit.roll_number} aria-label="Registration number"
                               onChange={(e) => setEdit({ ...edit, roll_number: e.target.value })} />
                      </td>
                      <td data-label="Name">
                        <input className="mini full" value={edit.name} aria-label="Name"
                               onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                      </td>
                      <td data-label="Lab">
                        <select className="mini" value={edit.lab} aria-label="Lab"
                                onChange={(e) => setEdit({ ...edit, lab: e.target.value })}>
                          {LABS.map((l) => <option key={l}>{l}</option>)}
                        </select>
                      </td>
                      <td data-label="Actions">
                        <span className="row-actions">
                          <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={busy}>Save</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>Cancel</button>
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td data-label="PLC Roll No" className="mono"><span className="plc-roll-badge">{s.plc_roll_number}</span></td>
                      <td data-label="Registration No" className="mono">{s.roll_number}</td>
                      <td data-label="Name" className="strong">{s.name}</td>
                      <td data-label="Lab"><LabBadge lab={s.lab} /></td>
                      <td data-label="Actions">
                        <span className="row-actions">
                          <button className="btn btn-dark btn-sm" onClick={() => setToMove(s)}>Change Lab</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setMsg(null); setFieldErrors({}); setEdit(s); }}>Edit</button>
                          <button className="btn btn-danger-ghost btn-sm" onClick={() => setToDelete(s)}>Delete</button>
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows.length > 0 && <p className="muted small">Showing {rows.length} of {all.length} students.</p>}
      </div>

      {toMove && (
        <ConfirmDialog
          title="Change lab?"
          message={`${toMove.name} will move from ${toMove.lab} to ${toMove.lab === "Lab 1" ? "Lab 2" : "Lab 1"}. Their past attendance stays exactly as it is.`}
          confirmLabel={`Move to ${toMove.lab === "Lab 1" ? "Lab 2" : "Lab 1"}`} busyLabel="Moving…" tone="primary"
          busy={busy} onConfirm={moveLab} onCancel={() => !busy && setToMove(null)}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Delete this student?"
          message={`${toDelete.name} (${toDelete.roll_number}) and ALL of their attendance records will be deleted. This can't be undone. To just move them to the other lab, use Change Lab instead.`}
          confirmLabel="Delete" busy={busy} onConfirm={remove} onCancel={() => !busy && setToDelete(null)}
        />
      )}
    </>
  );
}
