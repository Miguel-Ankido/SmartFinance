export type TransactionType = 'EXPENSE' | 'INCOME';

export type AccountType = 'CHECKING' | 'CREDIT_CARD' | 'INVESTMENT' | 'CASH';

export interface Account {
  id: string;
  userId?: string;
  user_id?: string;
  name: string;
  type: AccountType;
  color?: string;
  icon?: string;
  initialBalance?: number;
  initial_balance?: number;
  isActive?: boolean;
  is_active?: boolean;
}

export type CategoryId =
  | 'food'
  | 'transport'
  | 'entertainment'
  | 'bills'
  | 'shopping'
  | 'salary'
  | 'others';

export interface CategoryData {
  id: CategoryId;
  name: string;
  color: string;
  budgetLimit: number;
  spent: number;
}

export interface Budget {
  id?: string;
  userId?: string;
  user_id?: string;
  categoryId: CategoryId;
  category_id?: string;
  limitAmount: number;
  limit_amount?: number;
  updatedAt?: string;
  updated_at?: string;
}

export type MonthlyCategoryExpenses = Record<CategoryId, number>;

export interface Transaction {
  id: string;
  userId?: string;
  accountId?: string;
  account_id?: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: CategoryId;
  bankName: string;
  note?: string;
  timestamp: number;
  timeFormatted: string;
  dateFormatted: string;
  dateGroup: 'TODAY' | 'YESTERDAY' | 'PAST';
}

export interface BankCategoryExpense {
  categoryId: CategoryId;
  categoryName: string;
  color: string;
  amount: number;
  percentage: number;
}

export interface BankSpendingSummary {
  bankName: string;
  totalSpent: number;
  totalReceived: number;
  transactionCount: number;
  topCategoryName: string;
  categoryBreakdown: BankCategoryExpense[];
}

export interface DaySpending {
  dayName: string;
  short: string;
  amount: number;
  isPeak: boolean;
  isToday: boolean;
  height: number;
  percentage: number;
}

export interface MonthSpending {
  monthKey: string;
  monthName: string;
  short: string;
  income: number;
  expense: number;
  balance: number;
}

export interface MonitoredBank {
  id: string;
  name: string;
  packageName: string;
  isEnabled: boolean;
  color: string;
}
