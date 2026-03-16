import { createContext, useContext, useMemo, useState } from 'react';
import { initialState } from '../data/mockData';
import { AppState, Budget, Movement, Reminder, UserSession } from '../models/types';

const STORAGE_KEY = 'tu-plata-state';

interface AppContextValue extends AppState {
  login: (provider: UserSession['provider']) => void;
  logout: () => void;
  addMovement: (movement: Omit<Movement, 'id'>) => void;
  addBudget: (budget: Omit<Budget, 'id'>) => void;
  addReminder: (reminder: Omit<Reminder, 'id'>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const readState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? (JSON.parse(saved) as AppState) : initialState;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AppState>(() => readState());

  const persist = (next: AppState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      login: (provider) => {
        const profiles: Record<UserSession['provider'], UserSession> = {
          google: { name: 'Ana García', email: 'ana@tuplata.app', provider: 'google' },
          apple: { name: 'Usuario Apple', email: 'apple@tuplata.app', provider: 'apple' },
          guest: { name: 'Invitado', email: 'guest@tuplata.app', provider: 'guest' }
        };
        persist({ ...state, session: profiles[provider] });
      },
      logout: () => persist({ ...state, session: null }),
      addMovement: (movement) =>
        persist({ ...state, movements: [{ ...movement, id: crypto.randomUUID() }, ...state.movements] }),
      addBudget: (budget) => persist({ ...state, budgets: [{ ...budget, id: crypto.randomUUID() }, ...state.budgets] }),
      addReminder: (reminder) =>
        persist({ ...state, reminders: [{ ...reminder, id: crypto.randomUUID() }, ...state.reminders] })
    }),
    [state]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
};
