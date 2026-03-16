import { ActionCard } from '../components/ActionCard';
import { MobileShell } from '../components/MobileShell';
import { StatCard } from '../components/StatCard';
import { useApp } from '../context/AppContext';
import { currency } from '../utils/format';

export const DashboardPage = () => {
  const { movements } = useApp();
  const totalIncome = movements.filter((m) => m.kind === 'income').reduce((a, b) => a + b.amount, 0);
  const totalExpense = movements.filter((m) => m.kind === 'expense').reduce((a, b) => a + b.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <MobileShell title="Tu Plata, Sin Drama" subtitle="Bienvenido de vuelta">
      <div className="stack">
        <StatCard label="Balance disponible" value={currency(balance)} tone="primary" />
        <StatCard label="Ingresos" value={currency(totalIncome)} />
        <StatCard label="Gastos" value={currency(totalExpense)} />
        <ActionCard to="/expense/new" title="Registrar Gasto" subtitle="Añade un nuevo gasto" />
        <ActionCard to="/income/new" title="Registrar Ingreso" subtitle="Añade un nuevo ingreso" />
        <ActionCard to="/movements" title="Ver Movimientos" subtitle="Consulta tu historial" />
        <ActionCard to="/budgets" title="Presupuestos" subtitle="Define límites por categoría" />
        <ActionCard to="/reminders" title="Recordatorios" subtitle="No olvides tus pagos" />
        <ActionCard to="/help" title="Ayuda" subtitle="Aprende a usar la app" />
        <ActionCard to="/settings" title="Configuración" subtitle="Gestiona tu cuenta" />
      </div>
    </MobileShell>
  );
};
