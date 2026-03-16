import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { BudgetFormPage } from '../pages/BudgetFormPage';
import { BudgetsPage } from '../pages/BudgetsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ExpenseFormPage } from '../pages/ExpenseFormPage';
import { HelpPage } from '../pages/HelpPage';
import { IncomeFormPage } from '../pages/IncomeFormPage';
import { LoginPage } from '../pages/LoginPage';
import { MovementsPage } from '../pages/MovementsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ReminderFormPage } from '../pages/ReminderFormPage';
import { RemindersPage } from '../pages/RemindersPage';
import { SettingsPage } from '../pages/SettingsPage';

const Protected = ({ children }: { children: React.ReactElement }) => {
  const { session } = useApp();
  return session ? children : <Navigate to="/" replace />;
};

export const AppRouter = () => (
  <Routes>
    <Route path="/" element={<LoginPage />} />
    <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
    <Route path="/movements" element={<Protected><MovementsPage /></Protected>} />
    <Route path="/income/new" element={<Protected><IncomeFormPage /></Protected>} />
    <Route path="/expense/new" element={<Protected><ExpenseFormPage /></Protected>} />
    <Route path="/budgets" element={<Protected><BudgetsPage /></Protected>} />
    <Route path="/budgets/new" element={<Protected><BudgetFormPage /></Protected>} />
    <Route path="/reminders" element={<Protected><RemindersPage /></Protected>} />
    <Route path="/reminders/new" element={<Protected><ReminderFormPage /></Protected>} />
    <Route path="/help" element={<Protected><HelpPage /></Protected>} />
    <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
