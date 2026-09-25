import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { useFinance } from '../context/FinanceContext';

interface IncomeExpenseDetailModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function IncomeExpenseDetailModal({ visible, onClose }: IncomeExpenseDetailModalProps) {
  const { monthlyHistory } = useFinance();

  const totalIncomePeriod = monthlyHistory.reduce((acc, m) => acc + m.income, 0);
  const totalExpensePeriod = monthlyHistory.reduce((acc, m) => acc + m.expense, 0);
  const netSavings = totalIncomePeriod - totalExpensePeriod;
  const savingsRate = totalIncomePeriod > 0 ? Math.round((netSavings / totalIncomePeriod) * 100) : 0;

  const maxVal = Math.max(
    ...monthlyHistory.map(m => Math.max(m.income, m.expense)),
    100
  );

  const incomePoints = monthlyHistory
    .map((m, i) => {
      const x = 20 + i * 54;
      const y = 120 - (m.income / maxVal) * 90;
      return `${x},${y}`;
    })
    .join(' ');

  const expensePoints = monthlyHistory
    .map((m, i) => {
      const x = 20 + i * 54;
      const y = 120 - (m.expense / maxVal) * 90;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Toque fora para fechar */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.tagLabel}>ANÁLISE COMPARATIVA</Text>
              <Text style={styles.title}>Receitas vs Despesas</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Resumo do Período */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>RECEITA TOTAL</Text>
                <Text style={styles.incomeValue}>
                  {totalIncomePeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>DESPESA TOTAL</Text>
                <Text style={styles.expenseValue}>
                  {totalExpensePeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>SALDO DO PERÍODO</Text>
                <Text style={[styles.savingsValue, netSavings >= 0 ? styles.savingsPos : styles.savingsNeg]}>
                  {netSavings >= 0 ? '+ ' : '- '}
                  {Math.abs(netSavings).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
            </View>

            <View style={styles.savingsRateBadge}>
              <Text style={styles.savingsRateText}>
                Taxa de retenção média no período: <Text style={styles.savingsRateNumber}>{savingsRate}%</Text>
              </Text>
            </View>

            {/* Gráfico Dinâmico */}
            <Text style={styles.sectionHeading}>EVOLUÇÃO MENSAL VISUAL</Text>
            <View style={styles.expandedSvgCard}>
              <Svg width="100%" height="150" viewBox="0 0 320 150">
                <Line x1="10" y1="120" x2="310" y2="120" stroke="#1d2830" strokeWidth="1" />
                <Line x1="10" y1="75" x2="310" y2="75" stroke="#1d2830" strokeWidth="1" strokeDasharray="4 4" />
                <Line x1="10" y1="30" x2="310" y2="30" stroke="#1d2830" strokeWidth="1" strokeDasharray="4 4" />

                <Polyline points={incomePoints} fill="none" stroke={Colors.primary} strokeWidth="3" />
                <Polyline points={expensePoints} fill="none" stroke={Colors.expense} strokeWidth="3" />

                {monthlyHistory.map((m, i) => {
                  const x = 20 + i * 54;
                  const yInc = 120 - (m.income / maxVal) * 90;
                  const yExp = 120 - (m.expense / maxVal) * 90;
                  return (
                    <React.Fragment key={m.monthKey}>
                      <Circle cx={x} cy={yInc} r={4} fill={Colors.primary} />
                      <Circle cx={x} cy={yExp} r={4} fill={Colors.expense} />
                    </React.Fragment>
                  );
                })}
              </Svg>

              <View style={styles.legendRow}>
                <View style={styles.legendIndicator}>
                  <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                  <Text style={styles.legendLabel}>Receitas</Text>
                </View>
                <View style={styles.legendIndicator}>
                  <View style={[styles.dot, { backgroundColor: Colors.expense }]} />
                  <Text style={styles.legendLabel}>Despesas</Text>
                </View>
              </View>
            </View>

            {/* Detalhamento Mês a Mês */}
            <Text style={styles.sectionHeading}>DISCRIMINAÇÃO DETALHADA POR MÊS</Text>
            {monthlyHistory.map(m => {
              const diff = m.income - m.expense;
              const isPos = diff >= 0;
              return (
                <View key={m.monthKey} style={styles.monthCard}>
                  <View style={styles.monthCardHeader}>
                    <Text style={styles.monthName}>{m.monthName}</Text>
                    <Text style={[styles.monthDiffText, isPos ? styles.savingsPos : styles.savingsNeg]}>
                      Saldo: {isPos ? '+ ' : '- '}{Math.abs(diff).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Text>
                  </View>
                  <View style={styles.monthValuesRow}>
                    <Text style={styles.monthIncomeText}>
                      ↑ {m.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Text>
                    <Text style={styles.monthExpenseText}>
                      ↓ {m.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </Text>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity style={styles.dismissBtn} onPress={onClose}>
              <Text style={styles.dismissBtnText}>FECHAR DETALHES</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tagLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  title: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 2 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: Colors.textSecondary, fontSize: 13 },
  scrollContent: { paddingBottom: 28 },
  summaryBox: {
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  summaryItem: { flex: 1 },
  summaryLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  incomeValue: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  expenseValue: { color: Colors.expense, fontSize: 13, fontWeight: '800' },
  savingsValue: { fontSize: 13, fontWeight: '800' },
  savingsPos: { color: Colors.primary },
  savingsNeg: { color: Colors.expense },
  savingsRateBadge: {
    backgroundColor: 'rgba(198, 241, 53, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 12,
    alignItems: 'center',
  },
  savingsRateText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '500' },
  savingsRateNumber: { color: Colors.primary, fontWeight: '800' },
  sectionHeading: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 10,
  },
  expandedSvgCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: 14,
  },
  legendRow: { flexDirection: 'row', gap: 20, marginTop: 12 },
  legendIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  monthCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monthCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  monthName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  monthDiffText: { fontSize: 12, fontWeight: '700' },
  monthValuesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  monthIncomeText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  monthExpenseText: { color: Colors.expense, fontSize: 12, fontWeight: '600' },
  dismissBtn: {
    backgroundColor: Colors.surfaceCard,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dismissBtnText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
});