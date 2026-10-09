import { getSupabaseClient } from './supabase';
import type { Transaction } from '../types/database';

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

export const syncService = {
  async pushTransactions(localTransactions: Transaction[], userId: string): Promise<string[]> {
    if (!userId || userId === 'default_user') {
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
    if (!userId || userId === 'default_user') {
      return [];
    }

    let query = getSupabaseClient().from('transactions').select('*').eq('user_id', userId);
    if (lastSyncTimestamp) {
      query = query.gt('updated_at', lastSyncTimestamp);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return (data as unknown[])
      .map(toTransaction)
      .filter((transaction): transaction is Transaction => transaction !== null);
  },

  subscribeToChanges(userId: string, onRemoteChange: () => void): () => void {
    if (!userId || userId === 'default_user') {
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
