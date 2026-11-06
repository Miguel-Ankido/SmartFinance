import { calculateCurrentMonthExpensesByCategory } from '../src/context/FinanceContext';
import { Transaction } from '../src/types/finance';

describe('Épico 2 - Sistema de Limites e Orçamentos', () => {
  it('deve agrupar e somar apenas despesas (type === EXPENSE) do mês corrente por categoria', () => {
    const now = new Date();
    const currentMonthTimestamp = now.getTime();

    // Mês passado para verificar isolamento de período
    const pastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    const pastMonthTimestamp = pastMonthDate.getTime();

    const mockTransactions: Transaction[] = [
      {
        id: '1',
        title: 'Supermercado',
        amount: 150,
        type: 'EXPENSE',
        category: 'food',
        bankName: 'Nubank',
        timestamp: currentMonthTimestamp,
        timeFormatted: '12:00',
        dateFormatted: '06/11/2026',
        dateGroup: 'TODAY',
      },
      {
        id: '2',
        title: 'Restaurante',
        amount: 80,
        type: 'EXPENSE',
        category: 'food',
        bankName: 'PicPay',
        timestamp: currentMonthTimestamp,
        timeFormatted: '14:00',
        dateFormatted: '06/11/2026',
        dateGroup: 'TODAY',
      },
      {
        id: '3',
        title: 'Uber Viagem',
        amount: 45,
        type: 'EXPENSE',
        category: 'transport',
        bankName: 'Inter',
        timestamp: currentMonthTimestamp,
        timeFormatted: '16:00',
        dateFormatted: '06/11/2026',
        dateGroup: 'TODAY',
      },
      {
        id: '4',
        title: 'Salário Mensal',
        amount: 5000,
        type: 'INCOME', // Receita não deve somar nas despesas
        category: 'salary',
        bankName: 'Itaú',
        timestamp: currentMonthTimestamp,
        timeFormatted: '09:00',
        dateFormatted: '06/11/2026',
        dateGroup: 'TODAY',
      },
      {
        id: '5',
        title: 'Gasto Mês Passado',
        amount: 300,
        type: 'EXPENSE', // Mês anterior não deve somar
        category: 'food',
        bankName: 'Nubank',
        timestamp: pastMonthTimestamp,
        timeFormatted: '10:00',
        dateFormatted: '15/10/2026',
        dateGroup: 'PAST',
      },
    ];

    const result = calculateCurrentMonthExpensesByCategory(mockTransactions);

    expect(result.food).toBe(230); // 150 + 80
    expect(result.transport).toBe(45);
    expect(result.entertainment).toBe(0);
    expect(result.bills).toBe(0);
    expect(result.shopping).toBe(0);
    expect(result.salary).toBe(0); // type INCOME ignorado
    expect(result.others).toBe(0);
  });

  it('deve validar os limiares de cores de progresso (<75% verde, 75%-90% amarelo/laranja, >90% vermelho)', () => {
    const getStatusForPercentage = (spent: number, limit: number) => {
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      if (pct > 90) return { color: '#ef4444', status: pct >= 100 ? 'ESTOURADO' : 'CRÍTICO' };
      if (pct >= 75) return { color: '#f59e0b', status: 'ATENÇÃO' };
      return { color: '#c6f135', status: 'NORMAL' };
    };

    // Caso 1: 50% de gasto (<75%) -> Verde / NORMAL
    expect(getStatusForPercentage(50, 100)).toEqual({ color: '#c6f135', status: 'NORMAL' });
    expect(getStatusForPercentage(74, 100)).toEqual({ color: '#c6f135', status: 'NORMAL' });

    // Caso 2: 75% a 90% de gasto -> Amarelo/Laranja / ATENÇÃO
    expect(getStatusForPercentage(75, 100)).toEqual({ color: '#f59e0b', status: 'ATENÇÃO' });
    expect(getStatusForPercentage(85, 100)).toEqual({ color: '#f59e0b', status: 'ATENÇÃO' });
    expect(getStatusForPercentage(90, 100)).toEqual({ color: '#f59e0b', status: 'ATENÇÃO' });

    // Caso 3: > 90% de gasto -> Vermelho / CRÍTICO ou ESTOURADO
    expect(getStatusForPercentage(91, 100)).toEqual({ color: '#ef4444', status: 'CRÍTICO' });
    expect(getStatusForPercentage(100, 100)).toEqual({ color: '#ef4444', status: 'ESTOURADO' });
    expect(getStatusForPercentage(120, 100)).toEqual({ color: '#ef4444', status: 'ESTOURADO' });
  });
});
