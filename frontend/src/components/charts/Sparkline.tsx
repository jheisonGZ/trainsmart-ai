import "./charts.css";

export default function Sparkline({
  data,
  width = 140,
  height = 40,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return null;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 4;
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = data
    .map((value, index) => {
      const x = padding + index * stepX;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const lastX = padding + (data.length - 1) * stepX;
  const lastValue = data[data.length - 1];
  const lastY = height - padding - ((lastValue - min) / range) * (height - padding * 2);

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Tendencia: de ${data[0]} a ${lastValue}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--viz-blue)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={4} fill="var(--viz-blue)" stroke="var(--viz-surface)" strokeWidth={2} />
    </svg>
  );
}
