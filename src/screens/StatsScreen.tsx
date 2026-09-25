import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { BankSpendingSummary } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import BankDetailModal from '../components/BankDetailModal';
import IncomeExpenseDetailModal from '../components/IncomeExpenseDetailModal';
import CategoryDistributionModal from '../components/CategoryDistributionModal';

export default function StatsScreen() {
  const { bankSummaries, categories, monthlyHistory } = useFinance();
  const [selectedBank, setSelectedBank] = useState<BankSpendingSummary | null>(null);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Escala dinâmica das polilinhas (Receitas vs Despesas)
  const maxMonthlyVal = Math.max(
    ...monthlyHistory.map(m => Math.max(m.income, m.expense)),
    100
  );

  const incomePoints = monthlyHistory
    .map((m, i) => {
      const x = 20 + i * 48;
      const y = 95 - (m.income / maxMonthlyVal) * 75;
      return `${x},${y}`;
    })
    .join(' ');

  const expensePoints = monthlyHistory
    .map((m, i) => {
      const x = 20 + i * 48;
      const y = 95 - (m.expense / maxMonthlyVal) * 75;
      return `${x},${y}`;
    })
    .join(' ');

  // Arcos dinâmicos do Donut
  const activeCategories = categories.filter(c => c.spent > 0);
  const totalSpent = activeCategories.reduce((acc, c) => acc + c.spent, 0);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;
  const arcs = activeCategories.map(cat => {
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>ANALÍTICA</Text>
        <Text style={styles.headerTitle}>Insights</Text>
      </View>

      <Text style={styles.sectionTitle}>RANKING DE GASTOS POR BANCO</Text>
      {bankSummaries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardText}>Sem gastos registrados por instituição até o momento.</Text>
        </View>
      ) : (
        bankSummaries.map((item, index) => (
          <TouchableOpacity
            key={item.bankName}
            style={styles.bankCard}
            activeOpacity={0.7}
            onPress={() => setSelectedBank(item)}>
            <View style={styles.bankCardHeader}>
              <View style={styles.bankHeaderLeft}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>#{index + 1}</Text>
                </View>
                <View>
                  <Text style={styles.bankNameText}>{item.bankName}</Text>
                  <Text style={styles.bankSubText}>
                    {item.transactionCount} {item.transactionCount === 1 ? 'lançamento' : 'lançamentos'} • Toque para ver detalhes
                  </Text>
                </View>
              </View>
              <Text style={styles.bankSpentAmount}>
                {item.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>

            <View style={styles.bankCardFooter}>
              <Text style={styles.footerLabel}>Maior impacto em:</Text>
              <Text style={styles.footerCategoryBadge}>{item.topCategoryName}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      {/* Cartão Clicável: Receitas vs Despesas Dinâmico */}
      <TouchableOpacity
        style={styles.chartCardSpacing}
        activeOpacity={0.75}
        onPress={() => setIsIncomeModalOpen(true)}>
        <View style={styles.chartTitleRow}>
          <Text style={styles.chartCardTitle}>RECEITAS VS DESPESAS (6 MESES)</Text>
          <Text style={styles.expandHint}>EXPANDIR ↗</Text>
        </View>
        <View style={styles.svgWrapper}>
          <Svg width="100%" height="110" viewBox="0 0 280 110">
            <Line x1="10" y1="95" x2="270" y2="95" stroke="#1f2d37" strokeWidth="1" />
            <Polyline points={incomePoints} fill="none" stroke={Colors.primary} strokeWidth="2.5" />
            <Polyline points={expensePoints} fill="none" stroke={Colors.expense} strokeWidth="2.5" />
          </Svg>
          <View style={styles.monthsRow}>
            {monthlyHistory.map(m => (
              <Text key={m.monthKey} style={styles.monthText}>{m.short}</Text>
            ))}
          </View>
        </View>
      </TouchableOpacity>

      {/* Cartão Clicável: Distribuição por Categoria Dinâmica */}
      <TouchableOpacity
        style={styles.chartCard}
        activeOpacity={0.75}
        onPress={() => setIsCategoryModalOpen(true)}>
        <View style={styles.chartTitleRow}>
          <Text style={styles.chartCardTitle}>DISTRIBUIÇÃO POR CATEGORIA</Text>
          <Text style={styles.expandHint}>EXPANDIR ↗</Text>
        </View>
        <View style={styles.donutPlaceholderRow}>
          <Svg width="90" height="90" viewBox="0 0 90 90">
            <Circle cx="45" cy="45" r={radius} stroke="#1b252c" strokeWidth="10" fill="transparent" />
            {arcs.map(arc => (
              <Circle
                key={arc.id}
                cx="45"
                cy="45"
                r={radius}
                stroke={arc.color}
                strokeWidth="10"
                strokeDasharray={`${arc.strokeDash} ${circumference}`}
                fill="transparent"
                transform={`rotate(${arc.rotation} 45 45)`}
              />
            ))}
          </Svg>
          <View style={styles.legendContainer}>
            {arcs.length === 0 ? (
              <Text style={styles.legendEmpty}>Sem despesas registradas</Text>
            ) : (
              arcs.map(arc => (
                <Text key={arc.id} style={styles.legendItem}>
                  <Text style={{ color: arc.color }}>●</Text> {arc.name} ({arc.percentage}%)
                </Text>
              ))
            )}
          </View>
        </View>
      </TouchableOpacity>

      <BankDetailModal bankSummary={selectedBank} onClose={() => setSelectedBank(null)} />
      <IncomeExpenseDetailModal visible={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} />
      <CategoryDistributionModal visible={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginTop: 10, marginBottom: 18 },
  headerSubtitle: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 2 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 12 },
  emptyCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyCardText: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },
  bankCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bankCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bankHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(198, 241, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeText: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  bankNameText: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  bankSubText: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  bankSpentAmount: { color: Colors.expense, fontSize: 15, fontWeight: '800' },
  bankCardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: { color: Colors.textSecondary, fontSize: 11 },
  footerCategoryBadge: {
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  chartCardSpacing: {
    backgroundColor: Colors.surfaceCard,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    marginTop: 18,
  },
  chartTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  chartCardTitle: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  expandHint: { color: Colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  svgWrapper: { alignItems: 'center' },
  monthsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8 },
  monthText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
  donutPlaceholderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 6 },
  legendContainer: { gap: 6 },
  legendItem: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  legendEmpty: { color: Colors.textMuted, fontSize: 12 },
});