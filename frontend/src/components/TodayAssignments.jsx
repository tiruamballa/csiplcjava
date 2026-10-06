import useFetch from "../hooks/useFetch.js";
import { fetchToday } from "../services/api.js";
import AssignmentCard from "./AssignmentCard.jsx";
import { Empty, ErrorState, Loading } from "./StateMessage.jsx";

export default function TodayAssignments() {
  const { data, loading, error, reload } = useFetch(fetchToday);

  return (
    <section className="section" id="today" aria-labelledby="today-title">
      <div className="container">
        <div className="section-head">
          <h2 id="today-title">Today's Assignments</h2>
          {data?.day_number && <span className="day-chip">Day {data.day_number}</span>}
        </div>
        {loading && <Loading label="Loading today's questions…" />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && data.assignments.length === 0 && (
          <Empty title="No assignments yet">
            Today's questions haven't been posted. Check back soon.
          </Empty>
        )}
        {data && data.assignments.length > 0 && (
          <div className="grid">
            {data.assignments.map((a) => <AssignmentCard key={a.id} item={a} />)}
          </div>
        )}
      </div>
    </section>
  );
}
