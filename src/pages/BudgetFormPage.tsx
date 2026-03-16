import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileShell } from '../components/MobileShell';
import { useApp } from '../context/AppContext';
import { BudgetCategory } from '../models/types';

const categories: BudgetCategory[] = ['Alimentación', 'Transporte', 'Estudio', 'Entretenimiento', 'Salud', 'Otro'];

export const BudgetFormPage = () => {
  const [category, setCategory] = useState<BudgetCategory>('Alimentación');
  const [monthlyLimit, setMonthlyLimit] = useState('200000');
  const { addBudget } = useApp();
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    addBudget({ category, monthlyLimit: Number(monthlyLimit) });
    navigate('/budgets');
  };

  return (
    <MobileShell title="Crear presupuesto" subtitle="Límite mensual" back>
      <form className="panel" onSubmit={onSubmit}>
        <label>Categoría</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as BudgetCategory)}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label>Límite mensual</label>
        <input value={monthlyLimit} onChange={(e) => setMonthlyLimit(e.target.value)} required />
        <button type="submit">Guardar presupuesto</button>
      </form>
    </MobileShell>
  );
};
