import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Report from "../components/attendance/Report.jsx";
import SessionHistory from "../components/attendance/SessionHistory.jsx";

export default function AdminReport() {
  const navigate = useNavigate();
  const [key, setKey] = useState(0); // remounts the report after a session is deleted
  return (
    <div className="admin-page">
      <div className="section-head"><h2>Attendance Report</h2></div>
      <Report key={key} />
      <SessionHistory
        refreshKey={key} onChanged={() => setKey((k) => k + 1)}
        onOpen={(d, l) => navigate(`/admin/attendance?date=${d}&lab=${encodeURIComponent(l)}`)}
      />
    </div>
  );
}
