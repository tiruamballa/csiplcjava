export default function LabBadge({ lab }) {
  return <span className={`badge badge-lab ${lab === "Lab 2" ? "lab2" : "lab1"}`}>{lab}</span>;
}
