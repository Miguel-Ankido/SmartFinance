import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Transaction, TransactionType } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import TransactionDetailModal from '../components/TransactionDetailModal';
import AddTransactionModal from '../components/AddTransactionModal';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function TransactionsScreen() {
  const { transactions } = useFinance();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterMode, setFilterMode] = useState<'MONTH' | 'ALL'>('MONTH');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const currentYear = selectedDate.getFullYear();
  const currentMonthIdx = selectedDate.getMonth();

  const now = new Date();
  const isCurrentMonth = currentYear === now.getFullYear() && currentMonthIdx === now.getMonth();

  // Navegação Temporal
  const handlePrevMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setFilterMode('MONTH');
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setFilterMode('MONTH');
  };

  const handleResetCurrentMonth = () => {
    setSelectedDate(new Date());
    setFilterMode('MONTH');
  };

  // Filtragem das transações
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.timestamp);
      const matchesPeriod =
        filterMode === 'ALL' ||
        (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonthIdx);

      const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
      return matchesPeriod && matchesType;
    });
  }, [transactions, currentYear, currentMonthIdx, filterMode, typeFilter]);

  // Totais do período selecionado
  const periodIncome = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  const periodExpense = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  const periodBalance = periodIncome - periodExpense;

  // Agrupamento por data amigável
  const groupedData = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    filteredTransactions.forEach(tx => {
      const d = new Date(tx.timestamp);
      let label = '';
      if (d.toDateString() === today.toDateString()) {
        label = 'HOJE';
      } else if (d.toDateString() === yesterday.toDateString()) {
        label = 'ONTEM';
      } else {
        label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase();
      }

      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(tx);
    });

    return groups;
  }, [filteredTransactions]);

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>MOVIMENTAÇÕES</Text>
            <Text style={styles.headerTitle}>Extrato</Text>
          </View>

          <TouchableOpacity
            style={styles.newButton}
            activeOpacity={0.8}
            onPress={() => setIsAddModalOpen(true)}>
            <Text style={styles.newButtonText}>+ NOVO</Text>
          </TouchableOpacity>
        </View>

        {/* Barra de Navegação Temporal (Mês e Ano) */}
        <View style={styles.calendarBar}>
          <TouchableOpacity style={styles.arrowButton} onPress={handlePrevMonth}>
            <Text style={styles.arrowText}>◀</Text>
          </TouchableOpacity>

          <View style={styles.monthDisplayCenter}>
            <Text style={styles.monthYearText}>
              {MONTH_NAMES[currentMonthIdx]} {currentYear}
            </Text>
            {isCurrentMonth ? (
              <View style={styles.currentMonthBadge}>
                <Text style={styles.currentMonthBadgeText}>ATUAL</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={handleResetCurrentMonth}>
                <Text style={styles.returnTodayLink}>Voltar para hoje ↺</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.arrowButton} onPress={handleNextMonth}>
            <Text style={styles.arrowText}>▶</Text>
          </TouchableOpacity>
        </View>

        {/* Resumo Consolidado do Período */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>ENTRADAS</Text>
            <Text style={styles.summaryIncome}>
              + {periodIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>SAÍDAS</Text>
            <Text style={styles.summaryExpense}>
              - {periodExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>BALANÇO</Text>
            <Text style={[styles.summaryBalance, periodBalance >= 0 ? styles.balancePos : styles.balanceNeg]}>
              {periodBalance >= 0 ? '+ ' : '- '}
              {Math.abs(periodBalance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        </View>

        {/* Filtros de Tipo */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.pill, typeFilter === 'ALL' && styles.pillActive]}
            onPress={() => setTypeFilter('ALL')}>
            <Text style={[styles.pillText, typeFilter === 'ALL' && styles.pillTextActive]}>
              Todas ({filteredTransactions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, typeFilter === 'EXPENSE' && styles.pillActive]}
            onPress={() => setTypeFilter('EXPENSE')}>
            <Text style={[styles.pillText, typeFilter === 'EXPENSE' && styles.pillTextActive]}>
              Saídas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, typeFilter === 'INCOME' && styles.pillActive]}
            onPress={() => setTypeFilter('INCOME')}>
            <Text style={[styles.pillText, typeFilter === 'INCOME' && styles.pillTextActive]}>
              Entradas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.pill, filterMode === 'ALL' && styles.pillActive]}
            onPress={() => setFilterMode(prev => (prev === 'ALL' ? 'MONTH' : 'ALL'))}>
            <Text style={[styles.pillText, filterMode === 'ALL' && styles.pillTextActive]}>
              {filterMode === 'ALL' ? 'Ver Mês' : 'Ver Todos'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Listagem das Transações */}
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Nenhuma movimentação</Text>
            <Text style={styles.emptySubtitle}>
              Não encontramos registros em {MONTH_NAMES[currentMonthIdx]} de {currentYear}.
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              activeOpacity={0.8}
              onPress={() => setIsAddModalOpen(true)}>
              <Text style={styles.emptyAddBtnText}>+ Adicionar Lançamento</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.keys(groupedData).map(dateLabel => (
            <View key={dateLabel} style={styles.dateGroup}>
              <Text style={styles.dateGroupLabel}>{dateLabel}</Text>
              {groupedData[dateLabel].map(tx => (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txRow}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTx(tx)}>
                  <View style={styles.txLeft}>
                    <View style={styles.categorySquircle}>
                      <Text style={styles.categorySymbol}>•</Text>
                    </View>
                    <View>
                      <Text style={styles.txTitle}>{tx.title}</Text>
                      <Text style={styles.txTime}>
                        {tx.bankName} • {tx.timeFormatted}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.txAmount, tx.type === 'INCOME' && styles.txAmountIncome]}>
                    {tx.type === 'INCOME' ? '+ ' : '- '}
                    {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <TransactionDetailModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />
      <AddTransactionModal visible={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  headerSubtitle: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 2 },
  newButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  newButtonText: { color: '#000000', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  calendarBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  arrowText: { color: Colors.primary, fontSize: 11, fontWeight: '800' },
  monthDisplayCenter: { alignItems: 'center' },
  monthYearText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  currentMonthBadge: {
    backgroundColor: 'rgba(198, 241, 53, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  currentMonthBadgeText: { color: Colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  returnTodayLink: { color: Colors.primary, fontSize: 11, fontWeight: '600', marginTop: 3 },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  summaryLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  summaryIncome: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  summaryExpense: { color: Colors.expense, fontSize: 12, fontWeight: '800' },
  summaryBalance: { fontSize: 12, fontWeight: '800' },
  balancePos: { color: Colors.primary },
  balanceNeg: { color: Colors.expense },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    backgroundColor: Colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  pillTextActive: { color: '#000000', fontWeight: '800' },
  dateGroup: { marginBottom: 16 },
  dateGroupLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  categorySquircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#242a18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySymbol: { color: Colors.primary, fontSize: 18 },
  txTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  txTime: { color: Colors.textSecondary, fontSize: 11, marginTop: 3 },
  txAmount: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  txAmountIncome: { color: Colors.primary },
  emptyState: {
    backgroundColor: Colors.surfaceCard,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 10,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  emptySubtitle: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  emptyAddBtn: {
    backgroundColor: 'rgba(198, 241, 53, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(198, 241, 53, 0.3)',
  },
  emptyAddBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
});