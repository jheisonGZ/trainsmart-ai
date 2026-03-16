import { Link } from 'react-router-dom';

interface ActionCardProps {
  to: string;
  title: string;
  subtitle: string;
}

export const ActionCard = ({ to, title, subtitle }: ActionCardProps) => (
  <Link className="action-card" to={to}>
    <strong>{title}</strong>
    <span>{subtitle}</span>
  </Link>
);
