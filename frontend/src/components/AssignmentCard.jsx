import DifficultyBadge from "./DifficultyBadge.jsx";

export default function AssignmentCard({ item }) {
  return (
    <article className="card">
      <div className="card-top">
        <h3>{item.title}</h3>
        <DifficultyBadge level={item.difficulty} />
      </div>
      <p className="card-desc">{item.description}</p>
      <a
        className="btn btn-primary"
        href={item.question_link}
        target="_blank"
        rel="noopener noreferrer"
      >
        Solve Problem →
      </a>
    </article>
  );
}
