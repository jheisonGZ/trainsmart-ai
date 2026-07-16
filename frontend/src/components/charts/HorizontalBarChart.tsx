import "./charts.css";

export interface HorizontalBarDatum {
  label: string;
  value: number;
}

export default function HorizontalBarChart({ data }: { data: HorizontalBarDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="viz viz-hbar-chart" role="img" aria-label="Gráfico de barras horizontales">
      {data.map((d) => (
        <div className="viz-hbar-row" key={d.label} title={`${d.label}: ${d.value}`}>
          <span className="viz-hbar-label">{d.label}</span>
          <div className="viz-hbar-track">
            <div
              className="viz-hbar-fill"
              style={{ width: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="viz-hbar-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
