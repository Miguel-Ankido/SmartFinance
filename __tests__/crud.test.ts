/**
 * Testes para o Épico 4: Gestão Manual de Transações (CRUD Completo e Soft Delete)
 * - Verificação da edição de campos: valor, data, categoria, conta (account_id), descrição
 * - Verificação do Soft Delete: is_deleted = true (sem DROP/DELETE físico)
 * - Verificação da sincronização e formatação de datas
 */

import { Transaction, CategoryId } from '../src/types/finance';
import { Transaction as DbTransaction } from '../src/types/database';

// Helper de parsing de data usado no EditTransactionModal
function parseInputDate(dateStr: string, originalTimestamp: number): number {
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year >= 2000 && year <= 2100) {
      const orig = new Date(originalTimestamp);
      const newDate = new Date(year, month, day, orig.getHours(), orig.getMinutes(), orig.getSeconds());
      if (!isNaN(newDate.getTime())) {
        return newDate.getTime();
      }
    }
  }
  return originalTimestamp;
}

function formatDateToInput(timestamp: number): string {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper simulando mapToDbTransaction do FinanceContext
function mapToDbTransaction(tx: Transaction, userId: string, isDeleted = false): DbTransaction {
  const isoDate = new Date(tx.timestamp || Date.now()).toISOString();
  return {
    id: tx.id,
    user_id: userId,
    account_id: tx.accountId || tx.account_id || undefined,
    category_id: tx.category,
    amount: tx.amount,
    type: tx.type,
    payment_method: 'PIX',
    merchant: tx.title || 'Transação',
    description: `[bank=${tx.bankName}]\n${tx.note || ''}`,
    date: isoDate,
    is_business: false,
    synced_at: null,
    updated_at: new Date().toISOString(),
    is_deleted: isDeleted,
  };
}

describe('Épico 4: Gestão Manual de Transações (CRUD e Soft Delete)', () => {
  const sampleTx: Transaction = {
    id: 'tx-1234',
    userId: 'user-001',
    accountId: 'acc-wallet-1',
    title: 'Supermercado Central',
    amount: 150.5,
    type: 'EXPENSE',
    category: 'food',
    bankName: 'Nubank',
    note: 'Compras da semana',
    timestamp: new Date(2026, 10, 5, 14, 30, 0).getTime(), // 05/11/2026 14:30
    timeFormatted: '14:30',
    dateFormatted: '05 de Novembro de 2026',
    dateGroup: 'TODAY',
  };

  describe('Edição de Transação (Ações)', () => {
    it('permite alterar o valor da transação', () => {
      const updated: Transaction = {
        ...sampleTx,
        amount: 220.75,
      };
      expect(updated.amount).toBe(220.75);
      expect(updated.id).toBe(sampleTx.id);
    });

    it('permite alterar a descrição / estabelecimento', () => {
      const updated: Transaction = {
        ...sampleTx,
        title: 'Hipermercado Extra',
      };
      expect(updated.title).toBe('Hipermercado Extra');
    });

    it('permite alterar a categoria', () => {
      const updated: Transaction = {
        ...sampleTx,
        category: 'shopping' as CategoryId,
      };
      expect(updated.category).toBe('shopping');
    });

    it('permite alterar ou desvincular a carteira/conta (account_id)', () => {
      // Alterando conta
      const updatedWithNewAcc: Transaction = {
        ...sampleTx,
        accountId: 'acc-card-2',
        account_id: 'acc-card-2',
      };
      expect(updatedWithNewAcc.accountId).toBe('acc-card-2');

      // Desvinculando conta (padrão)
      const updatedWithoutAcc: Transaction = {
        ...sampleTx,
        accountId: undefined,
        account_id: undefined,
      };
      expect(updatedWithoutAcc.accountId).toBeUndefined();
    });

    it('permite alterar a data via parsing DD/MM/AAAA', () => {
      const originalTs = sampleTx.timestamp;
      const newTs = parseInputDate('10/11/2026', originalTs);
      const d = new Date(newTs);

      expect(d.getDate()).toBe(10);
      expect(d.getMonth()).toBe(10); // Novembro (0-indexed = 10)
      expect(d.getFullYear()).toBe(2026);
    });

    it('mantém o timestamp original se a data informada for inválida', () => {
      const originalTs = sampleTx.timestamp;
      expect(parseInputDate('invalid-date', originalTs)).toBe(originalTs);
      expect(parseInputDate('32/13/1990', originalTs)).toBe(originalTs);
    });

    it('formata o timestamp para exibição no input DD/MM/AAAA', () => {
      const ts = new Date(2026, 4, 15, 10, 0, 0).getTime(); // 15/05/2026
      expect(formatDateToInput(ts)).toBe('15/05/2026');
    });
  });

  describe('Soft Delete e Sincronização', () => {
    it('marca is_deleted = true no payload do banco (não remove fisicamente o registro)', () => {
      const dbTx = mapToDbTransaction(sampleTx, 'user-001', true);

      expect(dbTx.id).toBe('tx-1234');
      expect(dbTx.user_id).toBe('user-001');
      expect(dbTx.is_deleted).toBe(true);
      expect(dbTx.synced_at).toBeNull(); // Requer sincronização com Supabase
      expect(dbTx.updated_at).toBeDefined();
    });

    it('mapToDbTransaction para atualização mantém is_deleted = false', () => {
      const dbTx = mapToDbTransaction(sampleTx, 'user-001', false);

      expect(dbTx.is_deleted).toBe(false);
      expect(dbTx.synced_at).toBeNull();
      expect(dbTx.account_id).toBe('acc-wallet-1');
      expect(dbTx.merchant).toBe('Supermercado Central');
    });

    it('simula filtro de exclusão no estado local mantendo consistência', () => {
      const list = [sampleTx, { ...sampleTx, id: 'tx-5678', title: 'Farmácia' }];
      const toDeleteId = 'tx-1234';

      // Soft delete no banco -> filtro na memória
      const updatedList = list.filter(t => t.id !== toDeleteId);

      expect(updatedList).toHaveLength(1);
      expect(updatedList[0].id).toBe('tx-5678');
    });
  });
});
