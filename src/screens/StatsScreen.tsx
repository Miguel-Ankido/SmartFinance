import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { BankSpendingSummary } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import BankDetailModal from '../components/BankDetailModal';
import IncomeExpenseDetailModal from '../components/IncomeExpenseDetailModal';
import CategoryDistributionModal from '../components/CategoryDistributionModal';

export default function StatsScreen() {
  const { bankSummaries, categories, monthlyHistory, totalIncome, totalExpenses } = useFinance();
  const [selectedBank, setSelectedBank] = useState<BankSpendingSummary | null>(null);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Métricas resumo do mês corrente
  const currentMonth = useMemo(() => {
    if (monthlyHistory.length === 0) { return null; }
    return monthlyHistory[monthlyHistory.length - 1];
  }, [monthlyHistory]);

  const prevMonth = useMemo(() => {
    if (monthlyHistory.length < 2) { return null; }
    return monthlyHistory[monthlyHistory.length - 2];
  }, [monthlyHistory]);

  const expenseTrend = useMemo(() => {
    if (!currentMonth || !prevMonth || prevMonth.expense === 0) { return null; }
    const diff = ((currentMonth.expense - prevMonth.expense) / prevMonth.expense) * 100;
    return Math.round(diff);
  }, [currentMonth, prevMonth]);

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
      spent: cat.spent,
      strokeDash,
      rotation,
    };
  }).sort((a, b) => b.spent - a.spent);

  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>ANALÍTICA</Text>
        <Text style={styles.headerTitle}>Insights</Text>
      </View>

      {/* Resumo Rápido do Mês */}
      <View style={styles.quickSummaryRow}>
        <View style={styles.quickCard}>
          <Text style={styles.quickCardLabel}>TAXA DE RETENÇÃO</Text>
          <Text style={[styles.quickCardValue, { color: savingsRate >= 0 ? Colors.primary : Colors.expense }]}>
            {savingsRate}%
          </Text>
        </View>
        <View style={styles.quickCard}>
          <Text style={styles.quickCardLabel}>DESPESAS DO MÊS</Text>
          <Text style={[styles.quickCardValue, { color: Colors.expense }]}>
            {(currentMonth?.expense ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>
        {expenseTrend !== null && (
          <View style={styles.quickCard}>
            <Text style={styles.quickCardLabel}>VS MÊS ANTERIOR</Text>
            <Text style={[styles.quickCardValue, { color: expenseTrend <= 0 ? Colors.primary : Colors.expense }]}>
              {expenseTrend > 0 ? '↑' : '↓'} {Math.abs(expenseTrend)}%
            </Text>
          </View>
        )}
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
          <Svg width="100%" height="120" viewBox="0 0 280 120">
            <Line x1="10" y1="95" x2="270" y2="95" stroke="#1f2d37" strokeWidth="1" />
            <Line x1="10" y1="55" x2="270" y2="55" stroke="#1f2d37" strokeWidth="1" strokeDasharray="3 3" />
            <Polyline points={incomePoints} fill="none" stroke={Colors.primary} strokeWidth="2.5" />
            <Polyline points={expensePoints} fill="none" stroke={Colors.expense} strokeWidth="2.5" />

            {/* Pontos de dados com círculos */}
            {monthlyHistory.map((m, i) => {
              const x = 20 + i * 48;
              const yInc = 95 - (m.income / maxMonthlyVal) * 75;
              const yExp = 95 - (m.expense / maxMonthlyVal) * 75;
              return (
                <React.Fragment key={m.monthKey}>
                  <Circle cx={x} cy={yInc} r={3.5} fill={Colors.primary} />
                  <Circle cx={x} cy={yExp} r={3.5} fill={Colors.expense} />
                </React.Fragment>
              );
            })}
          </Svg>
          <View style={styles.monthsRow}>
            {monthlyHistory.map(m => (
              <Text key={m.monthKey} style={styles.monthText}>{m.short}</Text>
            ))}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.legendLabel}>Receitas</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.expense }]} />
              <Text style={styles.legendLabel}>Despesas</Text>
            </View>
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
        <View style={styles.donutRow}>
          <View style={styles.donutContainer}>
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
            {/* Total central */}
            <View style={styles.donutCenter}>
              <Text style={styles.donutCenterLabel}>TOTAL</Text>
              <Text style={styles.donutCenterValue}>
                {totalSpent >= 1000
                  ? `${(totalSpent / 1000).toFixed(1).replace(/\.0$/, '')}k`
                  : totalSpent.toFixed(0)}
              </Text>
            </View>
          </View>
          <View style={styles.legendContainer}>
            {arcs.length === 0 ? (
              <Text style={styles.legendEmpty}>Sem despesas registradas</Text>
            ) : (
              arcs.map(arc => (
                <View key={arc.id} style={styles.catLegendRow}>
                  <View style={styles.catLegendLeft}>
                    <View style={[styles.legendDot, { backgroundColor: arc.color }]} />
                    <Text style={styles.catLegendName}>{arc.name}</Text>
                  </View>
                  <Text style={styles.catLegendPct}>{arc.percentage}%</Text>
                </View>
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

  /* Quick Summary */
  quickSummaryRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.surfaceCard,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  quickCardLabel: { color: Colors.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  quickCardValue: { fontSize: 15, fontWeight: '800' },

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

  /* Legend shared */
  legendRow: { flexDirection: 'row', gap: 20, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },

  /* Donut */
  donutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 6 },
  donutContainer: { position: 'relative', width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutCenterLabel: { color: Colors.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },
  donutCenterValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800', marginTop: 1 },
  legendContainer: { gap: 6, flex: 1, paddingLeft: 16 },
  legendEmpty: { color: Colors.textMuted, fontSize: 12 },

  /* Category legend rows */
  catLegendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catLegendLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catLegendName: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  catLegendPct: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700' },
});
