interface Props {
  label: string;
  value: string;
  tone?: 'primary' | 'neutral';
}

export const StatCard = ({ label, value, tone = 'neutral' }: Props) => (
  <article className={`stat-card ${tone}`}>
    <p>{label}</p>
    <h3>{value}</h3>
  </article>
);
