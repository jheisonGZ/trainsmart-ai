import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileShell } from '../components/MobileShell';
import { useApp } from '../context/AppContext';
import { IncomeSource } from '../models/types';

const sources: IncomeSource[] = ['Familia', 'Beca', 'Trabajo', 'Otro'];

export const IncomeFormPage = () => {
  const [source, setSource] = useState<IncomeSource>('Familia');
  const [amount, setAmount] = useState('50000');
  const [description, setDescription] = useState('');
  const { addMovement } = useApp();
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    addMovement({ kind: 'income', category: source, amount: Number(amount), description, dateISO: new Date().toISOString() });
    navigate('/movements');
  };

  return (
    <MobileShell title="Registrar ingreso" subtitle="Tu Plata, sin drama" back>
      <form className="panel" onSubmit={onSubmit}>
        <label>Monto recibido</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <label>Fuente del ingreso</label>
        <select value={source} onChange={(e) => setSource(e.target.value as IncomeSource)}>
          {sources.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label>Descripción</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Mesada" />
        <button type="submit">Guardar ingreso</button>
      </form>
    </MobileShell>
  );
};
