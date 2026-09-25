export type TransactionType = 'EXPENSE' | 'INCOME';

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

export interface Transaction {
  id: string;
  userId?: string;
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