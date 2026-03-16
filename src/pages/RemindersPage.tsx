import { Link } from 'react-router-dom';
import { MobileShell } from '../components/MobileShell';
import { useApp } from '../context/AppContext';
import { currency, dateLabel } from '../utils/format';

export const RemindersPage = () => {
  const { reminders } = useApp();
  return (
    <MobileShell
      title="Recordatorios"
      subtitle="No olvides tus pagos"
      back
      actions={<Link className="pill" to="/reminders/new">Nuevo recordatorio</Link>}
    >
      <div className="stack">
        {reminders.length === 0 ? (
          <p>No tienes recordatorios pendientes.</p>
        ) : (
          reminders.map((r) => (
            <article className="movement" key={r.id}>
              <div>
                <strong>{r.title}</strong>
                <small>{dateLabel(r.dueDateISO)}</small>
              </div>
              <b>{r.amount ? currency(r.amount) : '-'}</b>
            </article>
          ))
        )}
      </div>
    </MobileShell>
  );
};
