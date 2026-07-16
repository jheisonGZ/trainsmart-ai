import "./charts.css";

export default function Meter({
  value,
  label,
  size = 84,
}: {
  value: number;
  label: string;
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="viz viz-meter">
      <div className="viz-meter-svg-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${clamped}%`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--viz-blue-track)"
            strokeWidth={strokeWidth}
            opacity={0.4}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--viz-blue)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="viz-meter-center">
          <strong>{Math.round(clamped)}%</strong>
        </div>
      </div>
      <span className="viz-meter-label">{label}</span>
    </div>
  );
}
