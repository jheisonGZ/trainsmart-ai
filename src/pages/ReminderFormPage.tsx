import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileShell } from '../components/MobileShell';
import { useApp } from '../context/AppContext';

export const ReminderFormPage = () => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('150000');
  const [date, setDate] = useState('');
  const [notifyWhen, setNotifyWhen] = useState<'El mismo día' | '1 día antes' | '3 días antes' | '1 semana antes'>('El mismo día');
  const { addReminder } = useApp();
  const navigate = useNavigate();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    addReminder({ title, amount: Number(amount), dueDateISO: date || new Date().toISOString(), notifyWhen });
    navigate('/reminders');
  };

  return (
    <MobileShell title="Crear recordatorio" subtitle="Pago pendiente" back>
      <form className="panel" onSubmit={onSubmit}>
        <label>Nombre del pago</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        <label>Monto</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        <label>Fecha límite</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <label>Cuándo notificar</label>
        <select value={notifyWhen} onChange={(e) => setNotifyWhen(e.target.value as typeof notifyWhen)}>
          <option>El mismo día</option>
          <option>1 día antes</option>
          <option>3 días antes</option>
          <option>1 semana antes</option>
        </select>
        <button type="submit">Crear recordatorio</button>
      </form>
    </MobileShell>
  );
};
