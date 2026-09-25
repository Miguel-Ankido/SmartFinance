import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { CategoryId, TransactionType } from '../types/finance';
import { useFinance } from '../context/FinanceContext';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
}

const AVAILABLE_BANKS = ['Nubank', 'PicPay', 'Banco Inter', 'Itaú', 'Bradesco', 'Santander', 'C6 Bank', 'Dinheiro'];

const CATEGORY_OPTIONS: { id: CategoryId; label: string; color: string }[] = [
  { id: 'food', label: 'Alimentação', color: Colors.catFood },
  { id: 'transport', label: 'Transporte', color: Colors.catTransport },
  { id: 'entertainment', label: 'Lazer', color: Colors.catEntertainment },
  { id: 'bills', label: 'Contas Fixas', color: Colors.catBills },
  { id: 'shopping', label: 'Compras', color: Colors.catShopping },
  { id: 'salary', label: 'Salário', color: Colors.catIncome },
];

export default function AddTransactionModal({ visible, onClose }: AddTransactionModalProps) {
  const { addManualTransaction } = useFinance();

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amountRaw, setAmountRaw] = useState('');
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('food');
  const [selectedBank, setSelectedBank] = useState<string>('Nubank');
  const [note, setNote] = useState('');

  const handleSave = () => {
    const numericAmount = parseFloat(amountRaw.replace(',', '.')) || 0;
    if (numericAmount <= 0) return;

    addManualTransaction({
      title: title.trim(),
      amount: numericAmount,
      type,
      category: selectedCategory,
      bankName: selectedBank,
      note: note.trim() || undefined,
    });

    setAmountRaw('');
    setTitle('');
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.topBar}>
            <Text style={styles.headerLabel}>NOVO REGISTO</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeCircle}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.mainTitle}>Nova Transação</Text>

          <View style={styles.typeSwitcher}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'EXPENSE' && styles.typeButtonExpenseActive]}
              onPress={() => setType('EXPENSE')}>
              <Text style={[styles.typeButtonText, type === 'EXPENSE' && styles.typeButtonTextActive]}>
                DESPESA
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'INCOME' && styles.typeButtonIncomeActive]}
              onPress={() => setType('INCOME')}>
              <Text style={[styles.typeButtonText, type === 'INCOME' && styles.typeButtonTextActive]}>
                RECEITA
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            <Text style={styles.fieldLabel}>VALOR DA TRANSAÇÃO</Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencyPrefix}>R$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0,00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={amountRaw}
                onChangeText={setAmountRaw}
              />
            </View>

            <Text style={styles.fieldLabel}>ESTABELECIMENTO / DESCRIÇÃO</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Supermercado, Restaurante..."
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.fieldLabel}>INSTITUIÇÃO BANCÁRIA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              {AVAILABLE_BANKS.map(bank => (
                <TouchableOpacity
                  key={bank}
                  style={[styles.bankChip, selectedBank === bank && styles.bankChipActive]}
                  onPress={() => setSelectedBank(bank)}>
                  <Text style={[styles.bankChipText, selectedBank === bank && styles.bankChipTextActive]}>
                    {bank}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>SELECIONE A CATEGORIA</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORY_OPTIONS.map(cat => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                      isSelected && { borderColor: cat.color },
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}>
                    <View style={[styles.categoryIndicator, { backgroundColor: cat.color }]} />
                    <Text style={[styles.categoryCardLabel, isSelected && styles.categoryCardLabelSelected]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>OBSERVAÇÃO (OPCIONAL)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Adicione uma nota sobre esta transação..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              value={note}
              onChangeText={setNote}
            />

            <TouchableOpacity style={styles.saveButton} activeOpacity={0.85} onPress={handleSave}>
              <Text style={styles.saveButtonText}>SALVAR TRANSAÇÃO</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: Colors.textSecondary, fontSize: 14 },
  mainTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 4, marginBottom: 14 },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  typeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  typeButtonExpenseActive: { backgroundColor: Colors.expense },
  typeButtonIncomeActive: { backgroundColor: Colors.primary },
  typeButtonText: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  typeButtonTextActive: { color: '#000000' },
  scrollBody: { paddingBottom: 30 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 12, marginBottom: 8 },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currencyPrefix: { color: Colors.primary, fontSize: 22, fontWeight: '800', marginRight: 8 },
  amountInput: { flex: 1, height: 50, color: Colors.textPrimary, fontSize: 22, fontWeight: '800' },
  textInput: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 46,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 13,
  },
  textArea: { height: 70, textAlignVertical: 'top', paddingTop: 10 },
  horizontalChips: { flexDirection: 'row', marginBottom: 6 },
  bankChip: {
    backgroundColor: Colors.surfaceCard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bankChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  bankChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  bankChipTextActive: { color: '#000000', fontWeight: '800' },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: {
    width: '31%',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  categoryCardSelected: {
    backgroundColor: '#16232b',
  },
  categoryIndicator: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  categoryCardLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '500', textAlign: 'center' },
  categoryCardLabelSelected: { color: Colors.textPrimary, fontWeight: '700' },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: { color: '#000000', fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
});