import { Link, useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  back?: boolean;
  children: React.ReactNode;
}

export const MobileShell = ({ title, subtitle, actions, back, children }: Props) => {
  const navigate = useNavigate();
  return (
    <main className="screen">
      <header className="topbar">
        <div className="left">
          {back ? <button onClick={() => navigate(-1)}>←</button> : <Link to="/dashboard">🏦</Link>}
          <div>
            <h1>{title}</h1>
            {subtitle && <small>{subtitle}</small>}
          </div>
        </div>
        <div>{actions}</div>
      </header>
      <section>{children}</section>
    </main>
  );
};
