import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import type { Account, Budget, Transaction } from '../types/database';

const BANK_PREFIX = '[bank=';

export function encodeBankDescription(bankName: string, note?: string): string {
  const cleanBank = (bankName || 'Manual').trim();
  const cleanNote = (note || '').trim();
  if (!cleanBank) {
    return cleanNote;
  }
  return cleanNote ? `${BANK_PREFIX}${cleanBank}]\n${cleanNote}` : `${BANK_PREFIX}${cleanBank}]`;
}

export function decodeBankDescription(description?: string): { bankName: string; note?: string } {
  if (!description) {
    return { bankName: 'Manual', note: undefined };
  }
  if (!description.startsWith(BANK_PREFIX)) {
    return { bankName: 'Manual', note: description || undefined };
  }
  const endIdx = description.indexOf(']');
  if (endIdx <= BANK_PREFIX.length) {
    return { bankName: 'Manual', note: description };
  }
  const bankName = description.substring(BANK_PREFIX.length, endIdx);
  const newlineIdx = description.indexOf('\n', endIdx);
  const note = newlineIdx >= 0 ? description.substring(newlineIdx + 1).trim() : '';
  return {
    bankName: bankName || 'Manual',
    note: note || undefined,
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function toTransaction(value: unknown): Transaction | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as Record<string, unknown>;
  const amount = typeof row.amount === 'number' ? row.amount : Number(row.amount);
  const id = asString(row.id);
  const userId = asString(row.user_id);
  const date = asString(row.date);
  const updatedAt = asString(row.updated_at);
  const type = row.type;
  const paymentMethod = row.payment_method;

  if (
    !id ||
    !userId ||
    !Number.isFinite(amount) ||
    (type !== 'INCOME' && type !== 'EXPENSE') ||
    !['PIX', 'DEBIT', 'CREDIT', 'TRANSFER', 'CASH'].includes(String(paymentMethod)) ||
    !date ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    user_id: userId,
    account_id: asString(row.account_id),
    category_id: asString(row.category_id),
    amount,
    type,
    payment_method: paymentMethod as Transaction['payment_method'],
    merchant: asString(row.merchant),
    description: asString(row.description),
    date,
    is_business: asBoolean(row.is_business),
    synced_at: new Date().toISOString(),
    updated_at: updatedAt,
    is_deleted: asBoolean(row.is_deleted),
  };
}

function toAccount(value: unknown): Account | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as Record<string, unknown>;
  const id = asString(row.id);
  const userId = asString(row.user_id);
  const name = asString(row.name);
  const type = asString(row.type) as Account['type'];
  const updatedAt = asString(row.updated_at);
  const initialBalance = typeof row.initial_balance === 'number' ? row.initial_balance : Number(row.initial_balance || 0);

  if (!id || !userId || !name || !type || !updatedAt) {
    return null;
  }

  return {
    id,
    user_id: userId,
    name,
    type,
    color: asString(row.color),
    icon: asString(row.icon),
    initial_balance: Number.isFinite(initialBalance) ? initialBalance : 0,
    is_active: row.is_active !== false,
    synced_at: new Date().toISOString(),
    updated_at: updatedAt,
    is_deleted: asBoolean(row.is_deleted),
  };
}

export const syncService = {
  async pushAccounts(localAccounts: Account[], userId: string): Promise<string[]> {
    if (!isSupabaseConfigured || !userId || userId === 'default_user') {
      return [];
    }

    const pending = localAccounts.filter(
      account =>
        !account.synced_at ||
        new Date(account.updated_at) > new Date(account.synced_at),
    );

    if (pending.length === 0) {
      return [];
    }

    const payload = pending.map(account => ({
      id: account.id,
      user_id: userId,
      name: account.name,
      type: account.type,
      color: account.color ?? null,
      icon: account.icon ?? null,
      initial_balance: account.initial_balance,
      is_active: account.is_active,
      updated_at: account.updated_at,
      is_deleted: account.is_deleted,
    }));

    const { error } = await getSupabaseClient()
      .from('accounts')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    return pending.map(account => account.id);
  },

  async pullAccounts(userId: string, lastSyncTimestamp?: string): Promise<Account[]> {
    if (!isSupabaseConfigured || !userId || userId === 'default_user') {
      return [];
    }

    let query = getSupabaseClient().from('accounts').select('*').eq('user_id', userId);
    if (lastSyncTimestamp) {
      query = query.gt('updated_at', lastSyncTimestamp);
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data)) {
      if (error) {
        throw error;
      }
      return [];
    }

    return (data as unknown[])
      .map(toAccount)
      .filter((account): account is Account => account !== null);
  },

  async pushTransactions(localTransactions: Transaction[], userId: string): Promise<string[]> {
    if (!isSupabaseConfigured || !userId || userId === 'default_user') {
      return [];
    }

    const pending = localTransactions.filter(
      transaction =>
        !transaction.synced_at ||
        new Date(transaction.updated_at) > new Date(transaction.synced_at),
    );

    if (pending.length === 0) {
      return [];
    }

    const payload = pending.map(transaction => ({
      id: transaction.id,
      user_id: userId,
      account_id: transaction.account_id ?? null,
      category_id: transaction.category_id ?? null,
      amount: transaction.amount,
      type: transaction.type,
      payment_method: transaction.payment_method,
      merchant: transaction.merchant ?? null,
      description: transaction.description ?? null,
      date: transaction.date,
      is_business: transaction.is_business,
      updated_at: transaction.updated_at,
      is_deleted: transaction.is_deleted,
    }));

    const { error } = await getSupabaseClient()
      .from('transactions')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    return pending.map(transaction => transaction.id);
  },

  async pullTransactions(userId: string, lastSyncTimestamp?: string): Promise<Transaction[]> {
    if (!isSupabaseConfigured || !userId || userId === 'default_user') {
      return [];
    }

    let query = getSupabaseClient().from('transactions').select('*').eq('user_id', userId);
    if (lastSyncTimestamp) {
      query = query.gt('updated_at', lastSyncTimestamp);
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data)) {
      if (error) {
        throw error;
      }
      return [];
    }

    return (data as unknown[])
      .map(toTransaction)
      .filter((transaction): transaction is Transaction => transaction !== null);
  },

  async pushBudgets(budgets: Budget[], userId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !userId || userId === 'default_user') {
      return false;
    }
    if (budgets.length === 0) return true;

    try {
      const payload = budgets.map(b => ({
        user_id: userId,
        category_id: b.category_id,
        limit_amount: b.limit_amount,
        updated_at: b.updated_at || new Date().toISOString(),
      }));

      const { error } = await getSupabaseClient()
        .from('budgets')
        .upsert(payload, { onConflict: 'user_id,category_id' });

      if (error) {
        console.warn('[SyncEngine] Falha ao sincronizar orçamentos no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[SyncEngine] Erro de rede ao sincronizar orçamentos:', e);
      return false;
    }
  },

  async pullBudgets(userId: string): Promise<Budget[]> {
    if (!isSupabaseConfigured || !userId || userId === 'default_user') {
      return [];
    }

    try {
      const { data, error } = await getSupabaseClient()
        .from('budgets')
        .select('*')
        .eq('user_id', userId);

      if (error || !Array.isArray(data)) {
        return [];
      }

      return data.map(row => ({
        user_id: String(row.user_id),
        category_id: String(row.category_id),
        limit_amount: Number(row.limit_amount) || 0,
        updated_at: String(row.updated_at),
      }));
    } catch (e) {
      console.warn('[SyncEngine] Erro de rede ao buscar orçamentos:', e);
      return [];
    }
  },

  subscribeToChanges(userId: string, onRemoteChange: () => void): () => void {
    if (!isSupabaseConfigured || !userId || userId === 'default_user') {
      return () => undefined;
    }

    const client = getSupabaseClient();
    const channel = client
      .channel(`sync-transactions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        onRemoteChange,
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },
};
