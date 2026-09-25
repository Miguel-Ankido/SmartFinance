import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Transaction } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import AddTransactionModal from '../components/AddTransactionModal';
import TransactionDetailModal from '../components/TransactionDetailModal';

export default function TransactionsScreen() {
  const { transactions } = useFinance();
  const [filter, setFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const filtered = transactions.filter(tx => {
    const matchesFilter = filter === 'ALL' || tx.type === filter;
    const matchesSearch =
      tx.title.toLowerCase().includes(search.toLowerCase()) ||
      tx.bankName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>HISTÓRICO</Text>
          <Text style={styles.headerTitle}>Extrato</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalOpen(true)}>
          <Text style={styles.addButtonText}>+ NOVO</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar estabelecimento, banco..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {(['ALL', 'EXPENSE', 'INCOME'] as const).map(item => (
          <TouchableOpacity
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filterPill, filter === item && styles.filterPillActive]}>
            <Text style={[styles.filterPillText, filter === item && styles.filterPillTextActive]}>
              {item === 'ALL' ? 'TODOS' : item === 'EXPENSE' ? 'DESPESAS' : 'RECEITAS'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.txCard}
            activeOpacity={0.7}
            onPress={() => setSelectedTx(item)}>
            <View style={styles.txLeft}>
              <View style={styles.categorySquircle}>
                <Text style={styles.categorySymbol}>•</Text>
              </View>
              <View>
                <Text style={styles.txTitle}>{item.title}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.txBankBadge}>{item.bankName}</Text>
                  <Text style={styles.txTime}>• {item.timeFormatted}</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.txAmount, item.type === 'INCOME' && styles.txAmountIncome]}>
              {item.type === 'INCOME' ? '+ ' : '- '}
              {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </TouchableOpacity>
        )}
      />

      <AddTransactionModal visible={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <TransactionDetailModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  header: {
    marginTop: 24,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 2 },
  addButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: { color: '#000000', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  searchContainer: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: { height: 46, color: Colors.textPrimary, fontSize: 13 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterPill: {
    backgroundColor: Colors.surfaceCard,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterPillText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  filterPillTextActive: { color: Colors.background },
  listContent: { paddingBottom: 30 },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  categorySquircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1d2719',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySymbol: { color: Colors.primary, fontSize: 18 },
  txTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  txBankBadge: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  txTime: { color: Colors.textSecondary, fontSize: 11 },
  txAmount: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  txAmountIncome: { color: Colors.primary },
});