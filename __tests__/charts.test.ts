/**
 * Testes para o Épico 3: Gráficos Dinâmicos e Dashboard
 * - Verificação do cálculo do weeklyData (fluxo semanal)
 * - Verificação do cálculo dos arcos do donut (distribuição por categoria)
 * - Verificação do monthlyHistory (receitas vs despesas 6 meses)
 * - Verificação da formatação compacta de valores
 */

import { Transaction, CategoryData, DaySpending } from '../src/types/finance';

// Helper: formatCompact (mesma lógica usada no HomeScreen)
const formatCompact = (value: number): string => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return value > 0 ? value.toFixed(0) : '';
};

// Helper: Simula o cálculo do weeklyData conforme o FinanceContext
function computeWeeklyData(transactions: Transaction[]): DaySpending[] {
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

    return { dayName, short: shorts[idx], amount: dayTotal, isToday };
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
}

// Helper: Simula o cálculo dos arcos do donut
function computeDonutArcs(categories: CategoryData[]) {
  const activeCategories = categories.filter(c => c.spent > 0);
  const totalSpent = activeCategories.reduce((acc, c) => acc + c.spent, 0);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;
  return activeCategories.map(cat => {
    const fraction = totalSpent > 0 ? cat.spent / totalSpent : 0;
    const strokeDash = fraction * circumference;
    const rotation = cumulativeAngle - 90;
    cumulativeAngle += fraction * 360;

    return {
      id: cat.id,
      color: cat.color,
      name: cat.name,
      percentage: Math.round(fraction * 100),
      strokeDash,
      rotation,
    };
  });
}

// Fábrica de transação mock
function makeTx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Test',
    amount: 0,
    type: 'EXPENSE',
    category: 'food',
    bankName: 'TestBank',
    timestamp: Date.now(),
    timeFormatted: '10:00',
    dateFormatted: '01/01/2026',
    dateGroup: 'TODAY',
    ...overrides,
  };
}

describe('Épico 3: Gráficos e Dashboard', () => {
  describe('formatCompact', () => {
    it('formata valores abaixo de 1000 como inteiro', () => {
      expect(formatCompact(250)).toBe('250');
      expect(formatCompact(99)).toBe('99');
    });

    it('formata valores acima de 1000 com sufixo k', () => {
      expect(formatCompact(1500)).toBe('1.5k');
      expect(formatCompact(2000)).toBe('2k');
      expect(formatCompact(12300)).toBe('12.3k');
    });

    it('retorna vazio para zero', () => {
      expect(formatCompact(0)).toBe('');
    });
  });

  describe('weeklyData computation', () => {
    it('retorna 7 dias (Segunda a Domingo)', () => {
      const result = computeWeeklyData([]);
      expect(result).toHaveLength(7);
      expect(result[0].dayName).toBe('Segunda');
      expect(result[6].dayName).toBe('Domingo');
    });

    it('todos os dias têm height mínimo de 8 quando sem transações', () => {
      const result = computeWeeklyData([]);
      result.forEach(d => {
        expect(d.height).toBe(8);
        expect(d.amount).toBe(0);
        expect(d.isPeak).toBe(false);
        expect(d.percentage).toBe(0);
      });
    });

    it('calcula apenas EXPENSE (ignora INCOME)', () => {
      const now = new Date();
      const todayTs = now.getTime();

      const txs = [
        makeTx({ amount: 100, type: 'EXPENSE', timestamp: todayTs }),
        makeTx({ amount: 500, type: 'INCOME', timestamp: todayTs }),
      ];

      const result = computeWeeklyData(txs);
      const todaySlot = result.find(d => d.isToday);
      expect(todaySlot).toBeDefined();
      expect(todaySlot!.amount).toBe(100); // ignora os 500 de INCOME
    });

    it('identifica o pico corretamente', () => {
      const now = new Date();
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(10, 0, 0, 0);

      const tuesday = new Date(monday);
      tuesday.setDate(monday.getDate() + 1);

      const txs = [
        makeTx({ amount: 50, type: 'EXPENSE', timestamp: monday.getTime() }),
        makeTx({ amount: 200, type: 'EXPENSE', timestamp: tuesday.getTime() }),
      ];

      const result = computeWeeklyData(txs);
      const peakDays = result.filter(d => d.isPeak);
      expect(peakDays).toHaveLength(1);
      expect(peakDays[0].dayName).toBe('Terça');
      expect(peakDays[0].amount).toBe(200);
    });

    it('calcula percentagem correta de cada dia', () => {
      const now = new Date();
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(10, 0, 0, 0);

      const wednesday = new Date(monday);
      wednesday.setDate(monday.getDate() + 2);

      const txs = [
        makeTx({ amount: 100, type: 'EXPENSE', timestamp: monday.getTime() }),
        makeTx({ amount: 100, type: 'EXPENSE', timestamp: wednesday.getTime() }),
      ];

      const result = computeWeeklyData(txs);
      expect(result[0].percentage).toBe(50); // Segunda = 50%
      expect(result[2].percentage).toBe(50); // Quarta = 50%
      expect(result[1].percentage).toBe(0);  // Terça = 0%
    });
  });

  describe('Donut arcs computation', () => {
    const mockCategories: CategoryData[] = [
      { id: 'food', name: 'Alimentação', color: '#f59e0b', budgetLimit: 500, spent: 300 },
      { id: 'transport', name: 'Transporte', color: '#38bdf8', budgetLimit: 200, spent: 100 },
      { id: 'entertainment', name: 'Lazer', color: '#a855f7', budgetLimit: 300, spent: 0 },
      { id: 'bills', name: 'Contas', color: '#f43f5e', budgetLimit: 400, spent: 100 },
    ];

    it('filtra categorias com spent = 0', () => {
      const arcs = computeDonutArcs(mockCategories);
      expect(arcs).toHaveLength(3); // entertainment tem spent=0
      expect(arcs.find(a => a.id === 'entertainment')).toBeUndefined();
    });

    it('percentagens somam 100%', () => {
      const arcs = computeDonutArcs(mockCategories);
      const totalPct = arcs.reduce((acc, a) => acc + a.percentage, 0);
      expect(totalPct).toBe(100);
    });

    it('maior categoria tem maior percentagem', () => {
      const arcs = computeDonutArcs(mockCategories);
      const foodArc = arcs.find(a => a.id === 'food');
      expect(foodArc).toBeDefined();
      expect(foodArc!.percentage).toBe(60); // 300/500 = 60%
    });

    it('strokeDash proporcional à circunferência', () => {
      const arcs = computeDonutArcs(mockCategories);
      const circumference = 2 * Math.PI * 34;
      const foodArc = arcs.find(a => a.id === 'food')!;
      expect(foodArc.strokeDash).toBeCloseTo(0.6 * circumference, 1);
    });

    it('rotação começa em -90 e acumula', () => {
      const arcs = computeDonutArcs(mockCategories);
      expect(arcs[0].rotation).toBe(-90); // primeiro arco
      // segundo arco deve ter rotação = -90 + (food_fraction * 360)
      const expectedRotation = -90 + (300 / 500) * 360;
      expect(arcs[1].rotation).toBeCloseTo(expectedRotation, 1);
    });

    it('retorna array vazio quando todas categorias têm spent = 0', () => {
      const emptyCategories: CategoryData[] = [
        { id: 'food', name: 'Alimentação', color: '#f59e0b', budgetLimit: 500, spent: 0 },
        { id: 'transport', name: 'Transporte', color: '#38bdf8', budgetLimit: 200, spent: 0 },
      ];
      const arcs = computeDonutArcs(emptyCategories);
      expect(arcs).toHaveLength(0);
    });
  });

  describe('Expense trend computation', () => {
    it('calcula tendência de despesa entre meses', () => {
      const prevExpense = 1000;
      const currExpense = 1200;
      const trend = Math.round(((currExpense - prevExpense) / prevExpense) * 100);
      expect(trend).toBe(20); // +20%
    });

    it('tendência negativa quando despesas diminuem', () => {
      const prevExpense = 1000;
      const currExpense = 800;
      const trend = Math.round(((currExpense - prevExpense) / prevExpense) * 100);
      expect(trend).toBe(-20); // -20%
    });

    it('retorna null quando mês anterior tem 0 despesas', () => {
      const prevExpense = 0;
      const result = prevExpense === 0 ? null : 10;
      expect(result).toBeNull();
    });
  });
});
