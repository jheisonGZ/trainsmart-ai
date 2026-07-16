import "./charts.css";

export interface BarDatum {
  label: string;
  value: number;
}

export default function BarChart({ data }: { data: BarDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="viz viz-bar-chart" role="img" aria-label="Gráfico de barras">
      {data.map((d) => (
        <div className="viz-bar-col" key={d.label} title={`${d.label}: ${d.value}`}>
          <div className="viz-bar-track">
            <div
              className="viz-bar-fill"
              style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="viz-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
