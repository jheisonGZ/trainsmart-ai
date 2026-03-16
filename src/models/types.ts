export type EntryKind = 'income' | 'expense';

export type IncomeSource = 'Familia' | 'Beca' | 'Trabajo' | 'Otro';
export type ExpenseCategory =
  | 'Alimentación'
  | 'Transporte'
  | 'Estudio'
  | 'Entretenimiento'
  | 'Salud'
  | 'Otro';

export type BudgetCategory = ExpenseCategory;

export interface Movement {
  id: string;
  kind: EntryKind;
  category: IncomeSource | ExpenseCategory;
  amount: number;
  description?: string;
  dateISO: string;
}

export interface Budget {
  id: string;
  category: BudgetCategory;
  monthlyLimit: number;
}

export interface Reminder {
  id: string;
  title: string;
  amount?: number;
  dueDateISO: string;
  notifyWhen: 'El mismo día' | '1 día antes' | '3 días antes' | '1 semana antes';
}

export interface UserSession {
  name: string;
  email: string;
  provider: 'google' | 'apple' | 'guest';
}

export interface AppState {
  session: UserSession | null;
  movements: Movement[];
  budgets: Budget[];
  reminders: Reminder[];
}
