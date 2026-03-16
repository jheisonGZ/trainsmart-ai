import { AppState } from '../models/types';

export const initialState: AppState = {
  session: null,
  movements: [
    {
      id: 'm1',
      kind: 'expense',
      category: 'Alimentación',
      amount: 15000,
      description: 'Mercado semanal',
      dateISO: new Date().toISOString()
    },
    {
      id: 'm2',
      kind: 'income',
      category: 'Trabajo',
      amount: 65000,
      description: 'Freelance',
      dateISO: new Date().toISOString()
    }
  ],
  budgets: [],
  reminders: []
};
