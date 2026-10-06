import { useEffect, useState } from "react";
import { fetchPublicStudents } from "../services/api.js";

export default function StudentLookupModal({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [labFilter, setLabFilter] = useState("All");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      fetchPublicStudents(query.trim())
        .then((data) => {
          if (active) {
            setStudents(Array.isArray(data) ? data : []);
            setError("");
          }
        })
        .catch((err) => {
          if (active) {
            if (err.response?.status === 404) {
              setError("Public search service is deploying on server. Please try again in 1 minute.");
            } else {
              setError("Could not load student details. Check connection and try again.");
            }
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query]);

  if (!open) return null;

  const filtered = students.filter((s) => {
    if (labFilter === "All") return true;
    return s.lab === labFilter;
  });

  return (
    <div className="overlay lookup-overlay" onClick={onClose}>
      <div className="dialog lookup-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="lookup-modal-header">
          <div>
            <h3>Find Your Lab & Attendance</h3>
            <p className="muted">
              Search by Registration Number, Full Name, or Middle Name.
            </p>
          </div>
          <button className="close-modal-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="lookup-modal-controls">
          <div className="field lookup-search-field">
            <input
              type="text"
              className="lookup-input"
              placeholder="Search by roll number or name (e.g., 25B91A0501, Mokshagna)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button className="clear-btn" onClick={() => setQuery("")} title="Clear search">
                ✕
              </button>
            )}
          </div>

          <div className="lookup-tabs">
            {["All", "Lab 1", "Lab 2"].map((lab) => (
              <button
                key={lab}
                className={`tab-btn ${labFilter === lab ? "active" : ""}`}
                onClick={() => setLabFilter(lab)}
              >
                {lab === "All" ? "All Labs" : lab}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="lookup-results-container">
          {loading ? (
            <div className="state">
              <span className="spinner" />
              <p>Loading student details…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="state">
              <h4>No students found</h4>
              <p>
                {query
                  ? `No student matching "${query}". Check spelling or try roll number.`
                  : "No students listed."}
              </p>
            </div>
          ) : (
            <div className="lookup-grid">
              {filtered.map((s) => (
                <div key={s.id} className="lookup-card">
                  <div className="lookup-card-top">
                    <div>
                      <h4 className="student-name">{s.name}</h4>
                      <span className="student-roll">{s.roll_number}</span>
                    </div>
                    <span className={`badge-lab ${s.lab === "Lab 1" ? "lab1" : "lab2"}`}>
                      {s.lab}
                    </span>
                  </div>
                  <div className="lookup-card-bottom">
                    <div className="pct-info">
                      <span className="pct-label">Current Attendance</span>
                      <span className={`pct-value ${s.percentage < 75 ? "low" : "ok"}`}>
                        {s.percentage}%
                      </span>
                    </div>
                    <div className="bar">
                      <span
                        className={s.percentage < 75 ? "low" : "ok"}
                        style={{ width: `${Math.min(s.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="pct-sub">
                      <span>{s.present} of {s.total} sessions attended</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
