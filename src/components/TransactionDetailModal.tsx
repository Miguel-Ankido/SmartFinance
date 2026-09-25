import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Transaction } from '../types/finance';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export default function TransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  if (!transaction) return null;

  const isIncome = transaction.type === 'INCOME';

  const categoryNames: Record<string, string> = {
    food: 'Alimentação',
    transport: 'Transporte',
    entertainment: 'Lazer',
    bills: 'Contas Fixas',
    shopping: 'Compras',
    salary: 'Salário/Renda',
    others: 'Diversos',
  };

  return (
    <Modal visible={!!transaction} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.tagBank}>{transaction.bankName.toUpperCase()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{transaction.title}</Text>
          <Text style={[styles.amount, isIncome ? styles.amountIncome : styles.amountExpense]}>
            {isIncome ? '+ ' : '- '}
            {transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Categoria</Text>
            <Text style={styles.value}>{categoryNames[transaction.category] || 'Diversos'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Horário</Text>
            <Text style={styles.value}>{transaction.timeFormatted}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Data</Text>
            <Text style={styles.value}>
              {new Date(transaction.timestamp).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Instituição</Text>
            <Text style={[styles.value, { color: Colors.primary }]}>{transaction.bankName}</Text>
          </View>

          {transaction.note ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Texto Original / Observação:</Text>
              <Text style={styles.noteContent}>{transaction.note}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
            <Text style={styles.dismissText}>FECHAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tagBank: {
    color: Colors.primary,
    backgroundColor: 'rgba(198, 241, 53, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: Colors.textSecondary, fontSize: 13 },
  title: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  amount: { fontSize: 28, fontWeight: '800', marginVertical: 8 },
  amountIncome: { color: Colors.primary },
  amountExpense: { color: Colors.expense },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  value: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  noteBox: {
    marginTop: 8,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 4 },
  noteContent: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17 },
  dismissButton: {
    marginTop: 18,
    backgroundColor: Colors.surfaceHover,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  dismissText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
});