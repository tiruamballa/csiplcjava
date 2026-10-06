import { useEffect, useState } from "react";
import { fetchPublicStudents } from "../services/api.js";

export default function StudentLookup() {
  const [query, setQuery] = useState("");
  const [labFilter, setLabFilter] = useState("All");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      fetchPublicStudents(query.trim())
        .then((data) => {
          if (active) {
            setStudents(data);
            setError("");
          }
        })
        .catch(() => {
          if (active) setError("Could not load student details. Please try again.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const filtered = students.filter((s) => {
    if (labFilter === "All") return true;
    return s.lab === labFilter;
  });

  return (
    <section className="section student-lookup-section" id="lookup">
      <div className="container">
        <div className="panel lookup-panel">
          <div className="lookup-header">
            <div>
              <h2>Find Your Lab & Attendance</h2>
              <p className="muted">
                Search by Registration Number, Full Name, or Middle Name (case-insensitive).
              </p>
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

          <div className="field lookup-search-field">
            <input
              type="text"
              className="lookup-input"
              placeholder="Search by roll number or name (e.g., 25B91A0501, Mokshagna)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="clear-btn" onClick={() => setQuery("")} title="Clear search">
                ✕
              </button>
            )}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="state">
              <span className="spinner" />
              <p>Searching students…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="state">
              <h3>No students found</h3>
              <p>
                {query
                  ? `No matching students found for "${query}". Try searching by registration number or middle name.`
                  : "No students registered yet."}
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
    </section>
  );
}
