import "./charts.css";

export default function StatTile({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="viz viz-stat-tile">
      <span className="viz-stat-label">{label}</span>
      <strong className="viz-stat-value">{value}</strong>
      {sublabel && <span className="viz-stat-sublabel">{sublabel}</span>}
    </div>
  );
}
