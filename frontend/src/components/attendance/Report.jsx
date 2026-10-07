import { useMemo, useState } from "react";
import useFetch from "../../hooks/useFetch.js";
import { fetchReport } from "../../services/api.js";
import LabBadge from "../LabBadge.jsx";
import { Empty, ErrorState, Loading } from "../StateMessage.jsx";

const natural = (a, b) => a.roll_number.localeCompare(b.roll_number, undefined, { numeric: true });
const LAB_FILTERS = ["All Labs", "Lab 1", "Lab 2"];

/** Spreadsheet-safe CSV. Cells starting with = + - @ are prefixed so Excel can't treat them as formulas. */
function downloadCsv(rows, labName) {
  const esc = (v) => {
    let t = String(v);
    if (/^[=+\-@]/.test(t) && Number.isNaN(Number(t))) t = "'" + t;
    return `"${t.replace(/"/g, '""')}"`;
  };
  const lines = [["Registration Number", "Name", "Lab", "Present", "Absent", "Total Sessions", "Attendance Percentage"]]
    .concat(rows.map((s) => [s.roll_number, s.name, s.lab, s.present, s.absent, s.total, s.total ? `${s.percentage}%` : "No data"]))
    .map((r) => r.map(esc).join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const tag = labName === "All Labs" ? "all-labs" : labName.toLowerCase().replace(" ", "-");
  a.download = `attendance-${tag}-${new Date().toLocaleDateString("en-CA")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export default function Report() {
  const [labFilter, setLabFilter] = useState("All Labs");
  const report = useFetch(() => fetchReport(labFilter === "All Labs" ? undefined : labFilter), [labFilter]);
  const [threshold, setThreshold] = useState(75);
  const [sort, setSort] = useState("roll");

  const rows = useMemo(() => {
    const list = [...(report.data?.students || [])];
    const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    if (sort === "low") return list.sort((a, b) => a.percentage - b.percentage || natural(a, b));
    if (sort === "high") return list.sort((a, b) => b.percentage - a.percentage || natural(a, b));
    if (sort === "name") return list.sort(byName);
    return list.sort(natural);
  }, [report.data, sort]);

  const withData = rows.filter((s) => s.total > 0);
  const avg = withData.length ? (withData.reduce((n, s) => n + s.percentage, 0) / withData.length).toFixed(1) : "0";
  const low = withData.filter((s) => s.percentage < threshold).length;

  return (
    <>
      <div className="panel">
        <div className="att-tools no-top">
          <div className="seg" role="group" aria-label="Filter by lab">
            {LAB_FILTERS.map((f) => (
              <button key={f} type="button" aria-pressed={labFilter === f}
                      className={`seg-btn seg-filter ${labFilter === f ? "on" : ""}`} onClick={() => setLabFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <label className="inline">Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="roll">Registration number</option>
              <option value="low">Lowest attendance</option>
              <option value="high">Highest attendance</option>
              <option value="name">Name</option>
            </select>
          </label>
          <label className="inline">Warn below
            <input type="number" min="1" max="100" value={threshold} className="num"
                   onChange={(e) => setThreshold(Math.min(100, Math.max(1, Number(e.target.value) || 75)))} />%
          </label>
          <button className="btn btn-dark btn-sm push" disabled={!rows.length} onClick={() => downloadCsv(rows, labFilter)}>
            Export CSV ({labFilter})
          </button>
        </div>
      </div>

      {report.loading && <Loading />}
      {report.error && <ErrorState message={report.error} onRetry={report.reload} />}

      {report.data && (
        <>
          <div className="stats stats-4">
            <div className="stat"><strong>{report.data.total_sessions}</strong><span>Sessions held</span></div>
            <div className="stat"><strong>{rows.length}</strong><span>Students</span></div>
            <div className="stat"><strong>{avg}%</strong><span>Average</span></div>
            <div className="stat stat-warn"><strong>{low}</strong><span>Below {threshold}%</span></div>
          </div>

          <div className="panel">
            {rows.length === 0 ? (
              <Empty title="No students here">Add students on the Students page to see their attendance.</Empty>
            ) : (
              <table className="table stack-table report-table">
                <thead>
                  <tr>
                    <th>PLC Roll No</th><th>Reg No</th><th>Name</th><th>Lab</th>
                    <th className="num-col">Present</th><th className="num-col">Absent</th><th className="num-col">Total</th>
                    <th>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const isLow = s.total > 0 && s.percentage < threshold;
                    return (
                      <tr key={s.id} className={isLow ? "row-low" : ""}>
                        <td data-label="PLC Roll No" className="mono"><span className="plc-roll-badge">{s.plc_roll_number}</span></td>
                        <td data-label="Reg No" className="mono">{s.roll_number}</td>
                        <td data-label="Name" className="strong">{s.name}</td>
                        <td data-label="Lab"><LabBadge lab={s.lab} /></td>
                        <td data-label="Present" className="num-col">{s.present}</td>
                        <td data-label="Absent" className="num-col">{s.absent}</td>
                        <td data-label="Total" className="num-col">{s.total}</td>
                        <td data-label="Attendance %">
                          {s.total === 0 ? <span className="muted">No data</span> : (
                            <div className="pct">
                              <div className="bar" aria-hidden="true">
                                <span className={isLow ? "low" : "ok"} style={{ width: `${s.percentage}%` }} />
                              </div>
                              <strong>{s.percentage}%</strong>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <p className="muted small">
              Attendance % = Present ÷ Total sessions × 100. The lab shown is the student's <em>current</em> lab;
              moving a student to another lab never changes their past attendance.
            </p>
          </div>
        </>
      )}
    </>
  );
}
