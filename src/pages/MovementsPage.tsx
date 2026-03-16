import { MobileShell } from '../components/MobileShell';
import { useApp } from '../context/AppContext';
import { currency, dateLabel } from '../utils/format';

export const MovementsPage = () => {
  const { movements } = useApp();

  return (
    <MobileShell title="Movimientos" subtitle="Tu Plata, Sin Drama" back>
      <div className="stack">
        {movements.map((m) => (
          <article key={m.id} className={`movement ${m.kind}`}>
            <div>
              <strong>{m.category}</strong>
              <small>{dateLabel(m.dateISO)}</small>
            </div>
            <b>{m.kind === 'income' ? '+' : '-'}{currency(m.amount)}</b>
          </article>
        ))}
      </div>
    </MobileShell>
  );
};
