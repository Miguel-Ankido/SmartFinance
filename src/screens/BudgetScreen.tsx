import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { CategoryData } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import EditBudgetModal from '../components/EditBudgetModal';

export default function BudgetScreen() {
  const { monthlyBudget, categories } = useFinance();
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(100, monthlyBudget.percentage)) / 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>METAS DO MÊS</Text>
        <Text style={styles.headerTitle}>Limites e Orçamento</Text>
      </View>

      {/* Cartão Central de Meta Consolidada */}
      <View style={styles.gaugeCard}>
        <View style={styles.gaugeContainer}>
          <Svg width="110" height="110" viewBox="0 0 110 110">
            <Circle cx="55" cy="55" r={radius} stroke="#1b252c" strokeWidth="9" fill="transparent" />
            <Circle
              cx="55"
              cy="55"
              r={radius}
              stroke={monthlyBudget.percentage >= 100 ? Colors.expense : Colors.primary}
              strokeWidth="9"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              transform="rotate(-90 55 55)"
            />
          </Svg>
          <View style={styles.gaugeLabelWrapper}>
            <Text
              style={[
                styles.gaugePercentage,
                monthlyBudget.percentage >= 100 && styles.gaugePercentageAlert,
              ]}>
              {monthlyBudget.percentage}%
            </Text>
            <Text style={styles.gaugeSubtext}>GASTO</Text>
          </View>
        </View>

        <View style={styles.budgetMetrics}>
          <View>
            <Text style={styles.budgetMetricLabel}>TETO TOTAL</Text>
            <Text style={styles.budgetLimitValue}>
              {monthlyBudget.limit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
          <View style={styles.remainingBlock}>
            <Text style={styles.budgetMetricLabel}>RESTANTE</Text>
            <Text
              style={[
                styles.budgetRemainingValue,
                monthlyBudget.remaining === 0 && monthlyBudget.spent > 0 && styles.remainingAlert,
              ]}>
              {monthlyBudget.remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>PROGRESSO POR CATEGORIA</Text>
        <Text style={styles.sectionHint}>Toque para ajustar</Text>
      </View>

      {/* Lista Interativa de Metas por Categoria */}
      {categories.map(item => {
        const pct = item.budgetLimit > 0 ? Math.round((item.spent / item.budgetLimit) * 100) : 0;
        const isOver = pct >= 100;
        const isWarning = pct >= 80 && pct < 100;

        const barColor = isOver ? Colors.expense : isWarning ? Colors.catFood : Colors.primary;

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.categoryCard}
            activeOpacity={0.7}
            onPress={() => setSelectedCategory(item)}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryTitleRow}>
                <View style={[styles.catDot, { backgroundColor: item.color }]} />
                <Text style={styles.categoryName}>{item.name}</Text>
                {isOver ? (
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>ESTOURADO</Text>
                  </View>
                ) : isWarning ? (
                  <View style={styles.warningBadge}>
                    <Text style={styles.warningBadgeText}>ALERTA</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.categoryNumbers}>
                {item.spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}
                <Text style={styles.categoryLimit}>
                  / {item.budgetLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </Text>
            </View>

            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${Math.min(100, pct)}%`, backgroundColor: barColor }]} />
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerPctText}>{pct}% utilizado</Text>
              <Text style={styles.footerAdjustText}>Editar meta ✎</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <EditBudgetModal category={selectedCategory} onClose={() => setSelectedCategory(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginTop: 10, marginBottom: 18 },
  headerSubtitle: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 2 },
  gaugeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surfaceCard,
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  gaugeContainer: { position: 'relative', width: 110, height: 110, justifyContent: 'center', alignItems: 'center' },
  gaugeLabelWrapper: { position: 'absolute', alignItems: 'center' },
  gaugePercentage: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800' },
  gaugePercentageAlert: { color: Colors.expense },
  gaugeSubtext: { color: Colors.textSecondary, fontSize: 9, fontWeight: '700', marginTop: 1 },
  budgetMetrics: { justifyContent: 'center' },
  remainingBlock: { marginTop: 10 },
  budgetMetricLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  budgetLimitValue: { color: Colors.textPrimary, fontSize: 17, fontWeight: '800', marginTop: 2 },
  budgetRemainingValue: { color: Colors.primary, fontSize: 17, fontWeight: '700', marginTop: 2 },
  remainingAlert: { color: Colors.expense },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  sectionHint: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  categoryCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  categoryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  alertBadge: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertBadgeText: { color: Colors.expense, fontSize: 9, fontWeight: '800' },
  warningBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  warningBadgeText: { color: Colors.catFood, fontSize: 9, fontWeight: '800' },
  categoryNumbers: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  categoryLimit: { color: Colors.textMuted, fontSize: 11, fontWeight: '500' },
  progressBarBackground: { height: 8, backgroundColor: '#18242a', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  footerPctText: { color: Colors.textMuted, fontSize: 11 },
  footerAdjustText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
});