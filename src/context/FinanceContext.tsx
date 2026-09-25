import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { NativeModules, NativeEventEmitter, AppState, AppStateStatus } from 'react-native';
import {
  Transaction,
  CategoryData,
  BankSpendingSummary,
  BankCategoryExpense,
  DaySpending,
  MonthSpending,
  CategoryId,
  TransactionType,
} from '../types/finance';
import { Colors } from '../theme/colors';

const { NotificationModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(NotificationModule);

interface NewTransactionInput {
  title: string;
  amount: number;
  type: TransactionType;
  category: CategoryId;
  bankName: string;
  note?: string;
}

interface FinanceContextData {
  hasPermission: boolean;
  requestPermission: () => void;
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  transactions: Transaction[];
  categories: CategoryData[];
  bankSummaries: BankSpendingSummary[];
  weeklyData: DaySpending[];
  monthlyHistory: MonthSpending[];
  monthlyBudget: {
    limit: number;
    spent: number;
    remaining: number;
    percentage: number;
  };
  addManualTransaction: (data: NewTransactionInput) => void;
}

const initialCategories: CategoryData[] = [
  { id: 'food', name: 'Alimentação', color: Colors.catFood, budgetLimit: 800, spent: 0 },
  { id: 'transport', name: 'Transporte', color: Colors.catTransport, budgetLimit: 300, spent: 0 },
  { id: 'entertainment', name: 'Lazer', color: Colors.catEntertainment, budgetLimit: 250, spent: 0 },
  { id: 'bills', name: 'Contas Fixas', color: Colors.catBills, budgetLimit: 1200, spent: 0 },
  { id: 'shopping', name: 'Compras', color: Colors.catShopping, budgetLimit: 600, spent: 0 },
  { id: 'salary', name: 'Salário/Renda', color: Colors.catIncome, budgetLimit: 0, spent: 0 },
  { id: 'others', name: 'Outros', color: Colors.textSecondary, budgetLimit: 400, spent: 0 },
];

const FinanceContext = createContext<FinanceContextData>({} as FinanceContextData);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>(initialCategories);

  const loadStoredData = useCallback(async () => {
    try {
      if (NotificationModule?.getStoredTransactions) {
        const stored: Transaction[] = await NotificationModule.getStoredTransactions();
        if (stored && Array.isArray(stored)) {
          setTransactions(stored);

          setCategories(prevCats =>
            prevCats.map(cat => {
              const totalSpentInCat = stored
                .filter(t => t.category === cat.id && t.type === 'EXPENSE')
                .reduce((acc, curr) => acc + curr.amount, 0);
              return { ...cat, spent: totalSpentInCat };
            })
          );
        }
      }
    } catch (e) {
      console.error('Erro ao ler SQLite nativo:', e);
    }
  }, []);

  const checkPermission = useCallback(async () => {
    try {
      if (NotificationModule?.isNotificationPermissionGranted) {
        const granted: boolean = await NotificationModule.isNotificationPermissionGranted();
        setHasPermission(granted);
      }
    } catch (e) {
      console.error('Erro checando permissão:', e);
    }
  }, []);

  const requestPermission = () => {
    NotificationModule?.requestNotificationPermission?.();
  };

  useEffect(() => {
    checkPermission();
    loadStoredData();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        checkPermission();
        loadStoredData();
      }
    });
    return () => sub.remove();
  }, [checkPermission, loadStoredData]);

  const addManualTransaction = useCallback((data: NewTransactionInput) => {
    const now = Date.now();
    const newTx: Transaction = {
      id: `manual_${now}_${Math.random().toString(36).substring(2, 7)}`,
      title: data.title.trim() || (data.type === 'EXPENSE' ? 'Despesa Manual' : 'Receita Manual'),
      amount: data.amount,
      type: data.type,
      category: data.category,
      bankName: data.bankName,
      note: data.note,
      timestamp: now,
      timeFormatted: new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      dateFormatted: 'Hoje',
      dateGroup: 'TODAY',
    };

    NotificationModule?.saveManualTransaction?.(newTx);
    setTransactions(prev => [newTx, ...prev]);

    if (data.type === 'EXPENSE') {
      setCategories(prev =>
        prev.map(cat => (cat.id === data.category ? { ...cat, spent: cat.spent + data.amount } : cat))
      );
    }
  }, []);

  useEffect(() => {
    const listener = eventEmitter.addListener('onBankNotificationReceived', (event: any) => {
      const newTx: Transaction = {
        id: event.id || `${Date.now()}`,
        title: event.title,
        amount: event.amount,
        type: event.type,
        category: event.category,
        bankName: event.bankName,
        note: event.text,
        timestamp: event.timestamp,
        timeFormatted: event.timeFormatted,
        dateFormatted: event.dateFormatted,
        dateGroup: 'TODAY',
      };

      setTransactions(prev => [newTx, ...prev]);

      if (event.type === 'EXPENSE') {
        setCategories(prev =>
          prev.map(cat => (cat.id === event.category ? { ...cat, spent: cat.spent + event.amount } : cat))
        );
      }
    });

    return () => listener.remove();
  }, []);

  const totalIncome = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalBalance = totalIncome - totalExpenses;
  const totalLimit = categories.reduce((acc, c) => acc + c.budgetLimit, 0);
  const totalSpent = categories.reduce((acc, c) => acc + c.spent, 0);
  const remaining = Math.max(0, totalLimit - totalSpent);
  const percentage = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  // 1. Agregação Semanal Dinâmica (Segunda a Domingo da semana corrente)
  const weeklyData = useMemo<DaySpending[]>(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const daysName = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const shorts = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

    const slots = daysName.map((dayName, idx) => {
      const slotDate = new Date(monday);
      slotDate.setDate(monday.getDate() + idx);
      const start = slotDate.getTime();
      const end = start + 86400000;
      const isToday = now.toDateString() === slotDate.toDateString();

      const dayTotal = transactions
        .filter(t => t.type === 'EXPENSE' && t.timestamp >= start && t.timestamp < end)
        .reduce((acc, t) => acc + t.amount, 0);

      return {
        dayName,
        short: shorts[idx],
        amount: dayTotal,
        isToday,
      };
    });

    const maxAmount = Math.max(...slots.map(s => s.amount), 0);
    const totalWeek = slots.reduce((acc, s) => acc + s.amount, 0);

    return slots.map(s => ({
      dayName: s.dayName,
      short: s.short,
      amount: s.amount,
      isToday: s.isToday,
      isPeak: maxAmount > 0 && s.amount === maxAmount,
      height: maxAmount > 0 ? Math.max(8, Math.round((s.amount / maxAmount) * 60)) : 8,
      percentage: totalWeek > 0 ? Math.round((s.amount / totalWeek) * 100) : 0,
    }));
  }, [transactions]);

  // 2. Histórico Mensal Dinâmico (Últimos 6 meses até o mês atual)
  const monthlyHistory = useMemo<MonthSpending[]>(() => {
    const now = new Date();
    const list: MonthSpending[] = [];
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthShorts = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const start = new Date(year, month, 1, 0, 0, 0).getTime();
      const end = new Date(year, month + 1, 1, 0, 0, 0).getTime();

      const inc = transactions
        .filter(t => t.type === 'INCOME' && t.timestamp >= start && t.timestamp < end)
        .reduce((acc, t) => acc + t.amount, 0);

      const exp = transactions
        .filter(t => t.type === 'EXPENSE' && t.timestamp >= start && t.timestamp < end)
        .reduce((acc, t) => acc + t.amount, 0);

      list.push({
        monthKey: `${year}-${month}`,
        monthName: monthNames[month],
        short: monthShorts[month],
        income: inc,
        expense: exp,
        balance: inc - exp,
      });
    }

    return list;
  }, [transactions]);

  // 3. Ranking de Gastos por Banco
  const bankSummaries = useMemo<BankSpendingSummary[]>(() => {
    const map = new Map<string, { spent: number; income: number; count: number; catCounts: Record<string, number> }>();

    transactions.forEach(tx => {
      const current = map.get(tx.bankName) || { spent: 0, income: 0, count: 0, catCounts: {} };
      if (tx.type === 'EXPENSE') {
        current.spent += tx.amount;
        current.catCounts[tx.category] = (current.catCounts[tx.category] || 0) + tx.amount;
      } else {
        current.income += tx.amount;
      }
      current.count += 1;
      map.set(tx.bankName, current);
    });

    const categoryMeta: Record<CategoryId, { name: string; color: string }> = {
      food: { name: 'Alimentação', color: Colors.catFood },
      transport: { name: 'Transporte', color: Colors.catTransport },
      entertainment: { name: 'Lazer', color: Colors.catEntertainment },
      bills: { name: 'Contas Fixas', color: Colors.catBills },
      shopping: { name: 'Compras', color: Colors.catShopping },
      salary: { name: 'Salário/Renda', color: Colors.catIncome },
      others: { name: 'Diversos', color: Colors.textSecondary },
    };

    return Array.from(map.entries())
      .map(([bankName, stats]) => {
        let topCatId: CategoryId = 'others';
        let maxVal = -1;
        Object.entries(stats.catCounts).forEach(([catId, val]) => {
          if (val > maxVal) {
            maxVal = val;
            topCatId = catId as CategoryId;
          }
        });

        const breakdown: BankCategoryExpense[] = Object.entries(stats.catCounts)
          .filter(([_, val]) => val > 0)
          .map(([catId, val]) => {
            const id = catId as CategoryId;
            const pct = stats.spent > 0 ? Math.round((val / stats.spent) * 100) : 0;
            return {
              categoryId: id,
              categoryName: categoryMeta[id]?.name || 'Diversos',
              color: categoryMeta[id]?.color || Colors.textSecondary,
              amount: val,
              percentage: pct,
            };
          })
          .sort((a, b) => b.amount - a.amount);

        return {
          bankName,
          totalSpent: stats.spent,
          totalReceived: stats.income,
          transactionCount: stats.count,
          topCategoryName: categoryMeta[topCatId]?.name || 'Diversos',
          categoryBreakdown: breakdown,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [transactions]);

  return (
    <FinanceContext.Provider
      value={{
        hasPermission,
        requestPermission,
        totalBalance,
        totalIncome,
        totalExpenses,
        transactions,
        categories,
        bankSummaries,
        weeklyData,
        monthlyHistory,
        monthlyBudget: {
          limit: totalLimit,
          spent: totalSpent,
          remaining,
          percentage,
        },
        addManualTransaction,
      }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => useContext(FinanceContext);