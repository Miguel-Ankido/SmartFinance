import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';
import { BankSpendingSummary } from '../types/finance';
import { useFinance } from '../context/FinanceContext';

interface BankDetailModalProps {
  bankSummary: BankSpendingSummary | null;
  onClose: () => void;
}

export default function BankDetailModal({ bankSummary, onClose }: BankDetailModalProps) {
  const { transactions } = useFinance();

  if (!bankSummary) return null;

  const bankTransactions = transactions
    .filter(tx => tx.bankName === bankSummary.bankName)
    .slice(0, 5);

  const netBalance = bankSummary.totalReceived - bankSummary.totalSpent;
  const isPositive = netBalance >= 0;

  return (
    <Modal visible={!!bankSummary} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.tagLabel}>RESUMO DA CONTA</Text>
              <Text style={styles.bankTitle}>{bankSummary.bankName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Bloco de Receitas vs Despesas */}
            <View style={styles.metricGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>TOTAL GASTO</Text>
                <Text style={styles.expenseValue}>
                  - {bankSummary.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>

              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>TOTAL RECEBIDO</Text>
                <Text style={styles.incomeValue}>
                  + {bankSummary.totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
            </View>

            <View style={styles.netBalanceRow}>
              <Text style={styles.netBalanceLabel}>Fluxo Líquido no Banco:</Text>
              <Text style={[styles.netBalanceValue, isPositive ? styles.netPositive : styles.netNegative]}>
                {isPositive ? '+ ' : '- '}
                {Math.abs(netBalance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>

            {/* Discriminação por Categoria */}
            <Text style={styles.sectionHeading}>GASTOS POR CATEGORIA</Text>
            {bankSummary.categoryBreakdown.length === 0 ? (
              <View style={styles.emptyCatBox}>
                <Text style={styles.emptyCatText}>Sem despesas categorizadas neste banco.</Text>
              </View>
            ) : (
              bankSummary.categoryBreakdown.map(item => (
                <View key={item.categoryId} style={styles.catCard}>
                  <View style={styles.catHeader}>
                    <View style={styles.catNameRow}>
                      <View style={[styles.catDot, { backgroundColor: item.color }]} />
                      <Text style={styles.catNameText}>{item.categoryName}</Text>
                    </View>
                    <Text style={styles.catAmountText}>
                      {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}
                      <Text style={styles.catPctText}>({item.percentage}%)</Text>
                    </Text>
                  </View>
                  <View style={styles.barBackground}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${item.percentage}%`, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </View>
              ))
            )}

            {/* Últimos lançamentos específicos */}
            <Text style={styles.sectionHeading}>ÚLTIMOS LANÇAMENTOS</Text>
            {bankTransactions.map(tx => (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txLeft}>
                  <Text style={styles.txTitle}>{tx.title}</Text>
                  <Text style={styles.txTime}>{tx.timeFormatted} • {tx.dateFormatted}</Text>
                </View>
                <Text style={[styles.txAmount, tx.type === 'INCOME' ? styles.incomeValue : styles.expenseValue]}>
                  {tx.type === 'INCOME' ? '+ ' : '- '}
                  {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
            ))}

            <TouchableOpacity style={styles.dismissBtn} onPress={onClose}>
              <Text style={styles.dismissBtnText}>CONCLUÍDO</Text>
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
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleGroup: { gap: 2 },
  tagLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  bankTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800' },
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
  metricGrid: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: Colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  expenseValue: { color: Colors.expense, fontSize: 16, fontWeight: '800' },
  incomeValue: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
  netBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  netBalanceLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' },
  netBalanceValue: { fontSize: 13, fontWeight: '800' },
  netPositive: { color: Colors.primary },
  netNegative: { color: Colors.expense },
  sectionHeading: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 10,
  },
  emptyCatBox: {
    backgroundColor: Colors.surfaceCard,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyCatText: { color: Colors.textMuted, fontSize: 12 },
  catCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catNameText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  catAmountText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  catPctText: { color: Colors.textMuted, fontSize: 11, fontWeight: '500' },
  barBackground: { height: 6, backgroundColor: '#18242a', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txLeft: { flex: 1 },
  txTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  txTime: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 13, fontWeight: '700' },
  dismissBtn: {
    backgroundColor: Colors.surfaceCard,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dismissBtnText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
});