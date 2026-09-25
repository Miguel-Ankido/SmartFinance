import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { useFinance } from '../context/FinanceContext';

export default function BudgetScreen() {
  const { monthlyBudget, categories } = useFinance();

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * monthlyBudget.percentage) / 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>TARGETS</Text>
        <Text style={styles.headerTitle}>Monthly Budgets</Text>
      </View>

      <View style={styles.gaugeCard}>
        <View style={styles.gaugeContainer}>
          <Svg width="110" height="110" viewBox="0 0 110 110">
            <Circle cx="55" cy="55" r={radius} stroke="#1b252c" strokeWidth="9" fill="transparent" />
            <Circle
              cx="55"
              cy="55"
              r={radius}
              stroke={Colors.primary}
              strokeWidth="9"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              transform="rotate(-90 55 55)"
            />
          </Svg>
          <View style={styles.gaugeLabelWrapper}>
            <Text style={styles.gaugePercentage}>{monthlyBudget.percentage}%</Text>
            <Text style={styles.gaugeSubtext}>SPENT</Text>
          </View>
        </View>

        <View style={styles.budgetMetrics}>
          <View>
            <Text style={styles.budgetMetricLabel}>TOTAL LIMIT</Text>
            <Text style={styles.budgetLimitValue}>${monthlyBudget.limit.toFixed(2)}</Text>
          </View>
          <View style={styles.remainingBlock}>
            <Text style={styles.budgetMetricLabel}>REMAINING</Text>
            <Text style={styles.budgetRemainingValue}>${monthlyBudget.remaining.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>CATEGORY BREAKDOWN</Text>

      {categories.map(item => {
        const pct = item.budgetLimit > 0 ? Math.min(100, Math.round((item.spent / item.budgetLimit) * 100)) : 0;
        return (
          <View key={item.id} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{item.name}</Text>
              <Text style={styles.categoryNumbers}>
                ${item.spent} <Text style={styles.categoryLimit}>/${item.budgetLimit}</Text>
              </Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
            </View>
          </View>
        );
      })}
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
  gaugeSubtext: { color: Colors.textSecondary, fontSize: 9, fontWeight: '700', marginTop: 1 },
  budgetMetrics: { justifyContent: 'center' },
  remainingBlock: { marginTop: 10 },
  budgetMetricLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  budgetLimitValue: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 2 },
  budgetRemainingValue: { color: Colors.primary, fontSize: 18, fontWeight: '700', marginTop: 2 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 14 },
  categoryCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  categoryName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  categoryNumbers: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  categoryLimit: { color: Colors.textMuted, fontSize: 12, fontWeight: '500' },
  progressBarBackground: { height: 8, backgroundColor: '#18242a', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
});