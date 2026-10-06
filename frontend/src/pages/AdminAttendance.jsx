import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import SessionHistory from "../components/attendance/SessionHistory.jsx";
import TakeAttendance from "../components/attendance/TakeAttendance.jsx";

const validLab = (l) => (l === "Lab 2" ? "Lab 2" : "Lab 1");
const validDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d : new Date().toLocaleDateString("en-CA"));

export default function AdminAttendance() {
  const [params, setParams] = useSearchParams();
  const date = validDate(params.get("date"));
  const lab = validLab(params.get("lab"));
  const [historyKey, setHistoryKey] = useState(0); // bumps after a save so the history list reloads
  const [sheetKey, setSheetKey] = useState(0);     // bumps after a delete so an open sheet reloads
  const saved = () => setHistoryKey((k) => k + 1);
  const deleted = () => { setHistoryKey((k) => k + 1); setSheetKey((k) => k + 1); };
  const go = (d, l) => setParams({ date: d, lab: l }, { replace: true });

  return (
    <div className="admin-page">
      <div className="section-head"><h2>Attendance</h2></div>
      <TakeAttendance
        key={sheetKey} date={date} lab={lab} setDate={(d) => go(d, lab)} setLab={(l) => go(date, l)}
        onSaved={saved}
      />
      <SessionHistory
        refreshKey={historyKey} onChanged={deleted}
        onOpen={(d, l) => { go(d, l); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      />
    </div>
  );
}
