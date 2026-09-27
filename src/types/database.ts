export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentMethod = 'PIX' | 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'CASH';
export type AccountType = 'CHECKING' | 'CREDIT_CARD' | 'INVESTMENT' | 'CASH';

export interface SyncControl {
  synced_at: string | null; // null = precisa subir para o Supabase
  updated_at: string;       // ISO-8601 UTC
  is_deleted: boolean;      // soft delete
}

export interface Account extends SyncControl {
  id: string; // UUID v4
  user_id: string;
  name: string;
  type: AccountType;
  color?: string;
  icon?: string;
  initial_balance: number;
  is_active: boolean;
}

export interface Category extends SyncControl {
  id: string; // UUID v4
  user_id: string;
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
  budget_limit: number;
}

export interface Transaction extends SyncControl {
  id: string; // UUID v4
  user_id: string;
  account_id?: string;
  category_id?: string;
  amount: number;
  type: TransactionType;
  payment_method: PaymentMethod;
  merchant?: string;
  description?: string;
  date: string; // ISO-8601 UTC
  is_business: boolean; // Flag PF / PJ
}