import { Link } from 'react-router-dom';
import { MobileShell } from '../components/MobileShell';
import { useApp } from '../context/AppContext';
import { currency } from '../utils/format';

export const BudgetsPage = () => {
  const { budgets } = useApp();
  return (
    <MobileShell
      title="Presupuestos"
      subtitle="Define límites por categoría"
      back
      actions={<Link className="pill" to="/budgets/new">Nuevo presupuesto</Link>}
    >
      <div className="stack">
        {budgets.length === 0 ? <p>No tienes presupuestos.</p> : budgets.map((b) => <article className="movement" key={b.id}><strong>{b.category}</strong><b>{currency(b.monthlyLimit)}</b></article>)}
      </div>
    </MobileShell>
  );
};
