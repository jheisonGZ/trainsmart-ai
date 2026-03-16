import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileShell } from '../components/MobileShell';
import { useApp } from '../context/AppContext';
import { ExpenseCategory } from '../models/types';

const categories: ExpenseCategory[] = ['Alimentación', 'Transporte', 'Estudio', 'Entretenimiento', 'Salud', 'Otro'];

export const ExpenseFormPage = () => {
  const [category, setCategory] = useState<ExpenseCategory>('Alimentación');
  const [amount, setAmount] = useState('15000');
  const [description, setDescription] = useState('');
  const { addMovement } = useApp();
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    addMovement({ kind: 'expense', category, amount: Number(amount), description, dateISO: new Date().toISOString() });
    navigate('/movements');
  };

  return (
    <MobileShell title="Registrar gasto" subtitle="Tu Plata, sin drama" back>
      <form className="panel" onSubmit={onSubmit}>
        <label>Monto</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <label>Categoría</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label>Descripción</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Almuerzo" />
        <button type="submit">Guardar gasto</button>
      </form>
    </MobileShell>
  );
};
