import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { Transaction } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import TransactionDetailModal from '../components/TransactionDetailModal';
import WeeklyOutflowDetailModal from '../components/WeeklyOutflowDetailModal';

export default function HomeScreen({ navigation }: any) {
  const { totalBalance, totalIncome, totalExpenses, transactions, weeklyData } = useFinance();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);

  const recent = transactions.slice(0, 3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeLabel}>BEM-VINDO</Text>
          <Text style={styles.userName}>Olá, Amanda</Text>
        </View>
        <View style={styles.avatarPlaceholder} />
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>SALDO TOTAL CONSOLIDADO</Text>
        <Text style={styles.balanceValue}>
          {totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </Text>

        <View style={styles.metricsRow}>
          <View>
            <Text style={styles.metricLabel}>↑ RECEITAS</Text>
            <Text style={styles.incomeValue}>
              {totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
          <View>
            <Text style={styles.metricLabel}>↓ DESPESAS</Text>
            <Text style={styles.expenseValue}>
              {totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        </View>
      </View>

      {/* Cartão de Saídas Semanais Dinâmico */}
      <TouchableOpacity
        style={styles.chartCard}
        activeOpacity={0.75}
        onPress={() => setIsWeeklyModalOpen(true)}>
        <View style={styles.chartTitleRow}>
          <Text style={styles.cardHeaderTitle}>FLUXO DE SAÍDAS SEMANAL</Text>
          <Text style={styles.expandHint}>EXPANDIR ↗</Text>
        </View>

        <View style={styles.chartWrapper}>
          <Svg width="100%" height="80" viewBox="0 0 280 80">
            {weeklyData.map((d, index) => {
              const x = 12 + index * 38;
              const y = 80 - d.height;
              const barColor = d.isPeak ? Colors.primary : '#1b2a32';
              return (
                <Rect
                  key={d.dayName}
                  x={x}
                  y={y}
                  width="18"
                  height={d.height}
                  rx="3"
                  fill={barColor}
                />
              );
            })}
          </Svg>
          <View style={styles.daysRow}>
            {weeklyData.map(d => (
              <Text key={d.dayName} style={[styles.dayText, d.isPeak && styles.activeDayText]}>
                {d.short}
              </Text>
            ))}
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.transactionsHeader}>
        <Text style={styles.cardHeaderTitle}>ATIVIDADE RECENTE</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Extrato')}>
          <Text style={styles.seeAllText}>VER TUDO</Text>
        </TouchableOpacity>
      </View>

      {recent.map(tx => (
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
              <Text style={styles.txTime}>{tx.bankName} • {tx.timeFormatted}</Text>
            </View>
          </View>
          <Text style={[styles.txAmount, tx.type === 'INCOME' && styles.txAmountIncome]}>
            {tx.type === 'INCOME' ? '+ ' : '- '}
            {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </TouchableOpacity>
      ))}

      <TransactionDetailModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />
      <WeeklyOutflowDetailModal visible={isWeeklyModalOpen} onClose={() => setIsWeeklyModalOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  welcomeLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  userName: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 2 },
  avatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ffffff' },
  balanceCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  balanceLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  balanceValue: { color: Colors.textPrimary, fontSize: 28, fontWeight: '800', marginVertical: 8 },
  metricsRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: 36, marginTop: 6 },
  metricLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  incomeValue: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  expenseValue: { color: Colors.expense, fontSize: 15, fontWeight: '700' },
  chartCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  chartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  expandHint: { color: Colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  chartWrapper: { marginTop: 16 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 8 },
  dayText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  activeDayText: { color: Colors.primary },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  txRow: {
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
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
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
});