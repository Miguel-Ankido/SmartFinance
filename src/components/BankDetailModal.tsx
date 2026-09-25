import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';
import { BankSpendingSummary } from '../types/finance';

interface BankDetailModalProps {
  bankSummary: BankSpendingSummary | null;
  onClose: () => void;
}

export default function BankDetailModal({ bankSummary, onClose }: BankDetailModalProps) {
  if (!bankSummary) return null;

  return (
    <Modal visible={!!bankSummary} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Toque fora para fechar */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.tagLabel}>DETALHES DA INSTITUIÇÃO</Text>
              <Text style={styles.title}>{bankSummary.bankName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Resumo do Banco */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>TOTAL GASTO</Text>
                <Text style={styles.spentValue}>
                  {bankSummary.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>TOTAL RECEBIDO</Text>
                <Text style={styles.incomeValue}>
                  {bankSummary.totalReceived.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>LANÇAMENTOS</Text>
                <Text style={styles.countValue}>{bankSummary.transactionCount}</Text>
              </View>
            </View>

            {/* Discriminação de Categorias neste Banco */}
            <Text style={styles.sectionHeading}>DISTRIBUIÇÃO DE GASTOS POR CATEGORIA</Text>
            {bankSummary.categoryBreakdown.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Sem despesas registradas nesta instituição.</Text>
              </View>
            ) : (
              bankSummary.categoryBreakdown.map(item => (
                <View key={item.categoryId} style={styles.catCard}>
                  <View style={styles.catHeader}>
                    <View style={styles.catLeft}>
                      <View style={[styles.dot, { backgroundColor: item.color }]} />
                      <Text style={styles.catName}>{item.categoryName}</Text>
                    </View>
                    <Text style={styles.catAmount}>
                      {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}
                      <Text style={styles.catPct}>({item.percentage}%)</Text>
                    </Text>
                  </View>

                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
                  </View>
                </View>
              ))
            )}

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
    marginBottom: 14,
  },
  summaryItem: { flex: 1 },
  summaryLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  spentValue: { color: Colors.expense, fontSize: 13, fontWeight: '800' },
  incomeValue: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  countValue: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800' },
  sectionHeading: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  emptyBox: {
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
  catCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  catName: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  catAmount: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  catPct: { color: Colors.textMuted, fontSize: 11, fontWeight: '500' },
  barBg: { height: 6, backgroundColor: '#18242a', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
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