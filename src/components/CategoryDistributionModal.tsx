import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { useFinance } from '../context/FinanceContext';

interface CategoryDistributionModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CategoryDistributionModal({ visible, onClose }: CategoryDistributionModalProps) {
  const { categories, transactions } = useFinance();

  const activeCategories = categories.filter(c => c.spent > 0);
  const totalSpentAll = activeCategories.reduce((acc, c) => acc + c.spent, 0);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;
  const arcs = activeCategories.map(cat => {
    const fraction = totalSpentAll > 0 ? cat.spent / totalSpentAll : 0;
    const strokeDash = fraction * circumference;
    const rotation = cumulativeAngle - 90;
    cumulativeAngle += fraction * 360;

    return {
      id: cat.id,
      color: cat.color,
      strokeDash,
      rotation,
    };
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Toque fora para fechar */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.tagLabel}>VISÃO CATEGORIZADA</Text>
              <Text style={styles.title}>Gastos por Categoria</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Gráfico Donut */}
            <View style={styles.centerChartBox}>
              <Svg width="120" height="120" viewBox="0 0 120 120">
                <Circle cx="60" cy="60" r={radius} stroke="#1b252c" strokeWidth="12" fill="transparent" />
                {arcs.map(arc => (
                  <Circle
                    key={arc.id}
                    cx="60"
                    cy="60"
                    r={radius}
                    stroke={arc.color}
                    strokeWidth="12"
                    strokeDasharray={`${arc.strokeDash} ${circumference}`}
                    fill="transparent"
                    transform={`rotate(${arc.rotation} 60 60)`}
                  />
                ))}
              </Svg>
              <View style={styles.totalCenterBlock}>
                <Text style={styles.totalCenterLabel}>TOTAL</Text>
                <Text style={styles.totalCenterValue}>
                  {totalSpentAll.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionHeading}>RANKING E PERCENTUAL DETALHADO</Text>
            {activeCategories.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Nenhuma despesa registrada até o momento.</Text>
              </View>
            ) : (
              activeCategories.map(item => {
                const pct = totalSpentAll > 0 ? Math.round((item.spent / totalSpentAll) * 100) : 0;
                const count = transactions.filter(t => t.category === item.id && t.type === 'EXPENSE').length;
                return (
                  <View key={item.id} style={styles.categoryCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.categoryTitleRow}>
                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                        <Text style={styles.categoryNameText}>{item.name}</Text>
                      </View>
                      <Text style={styles.amountText}>
                        {item.spent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}
                        <Text style={styles.pctText}>({pct}%)</Text>
                      </Text>
                    </View>

                    <View style={styles.barBackground}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${pct}%`, backgroundColor: item.color },
                        ]}
                      />
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.footerNote}>
                        {count} {count === 1 ? 'transação associada' : 'transações associadas'}
                      </Text>
                      <Text style={styles.budgetStatus}>Teto: R$ {item.budgetLimit}</Text>
                    </View>
                  </View>
                );
              })
            )}

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
  centerChartBox: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  totalCenterBlock: { position: 'absolute', alignItems: 'center' },
  totalCenterLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  totalCenterValue: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800', marginTop: 2 },
  sectionHeading: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 10,
  },
  emptyBox: {
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
  categoryCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  categoryNameText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  amountText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  pctText: { color: Colors.textMuted, fontSize: 11, fontWeight: '500' },
  barBackground: { height: 6, backgroundColor: '#18242a', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  footerNote: { color: Colors.textMuted, fontSize: 11 },
  budgetStatus: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
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