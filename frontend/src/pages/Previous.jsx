import { Link, useParams } from "react-router-dom";
import AssignmentCard from "../components/AssignmentCard.jsx";
import { Empty, ErrorState, Loading } from "../components/StateMessage.jsx";
import useFetch from "../hooks/useFetch.js";
import { fetchAll, fetchDay } from "../services/api.js";

function groupByDay(items) {
  const map = new Map();
  items.forEach((a) => {
    if (!map.has(a.day_number)) map.set(a.day_number, []);
    map.get(a.day_number).push(a);
  });
  return [...map.entries()].sort((a, b) => b[0] - a[0]);
}

function DayList() {
  const { data, loading, error, reload } = useFetch(fetchAll);
  const days = data ? groupByDay(data) : [];

  return (
    <div className="container section">
      <div className="section-head"><h2>Previous Assignments</h2></div>
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && days.length === 0 && <Empty title="Nothing here yet">Assignments will show up once they're posted.</Empty>}
      <div className="day-list">
        {days.map(([day, items]) => (
          <Link key={day} to={`/previous/${day}`} className="day-row">
            <h3>Day {day}</h3>
            <ul>{items.map((a) => <li key={a.id}>{a.title}</li>)}</ul>
            <span className="day-link">View questions →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DayDetail({ day }) {
  const { data, loading, error, reload } = useFetch(() => fetchDay(day), [day]);
  return (
    <div className="container section">
      <Link to="/previous" className="back">← All previous assignments</Link>
      <div className="section-head"><h2>Day {day}</h2></div>
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && <div className="grid">{data.map((a) => <AssignmentCard key={a.id} item={a} />)}</div>}
    </div>
  );
}

export default function Previous() {
  const { day } = useParams();
  return <div className="page-top">{day ? <DayDetail day={day} /> : <DayList />}</div>;
}
