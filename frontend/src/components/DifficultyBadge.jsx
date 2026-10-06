export default function DifficultyBadge({ level }) {
  return <span className={`badge badge-${level.toLowerCase()}`}>{level}</span>;
}
