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
  { id: 'others', label: 'Outros', color: Colors.textSecondary },
];

export default function AddTransactionModal({ visible, onClose }: AddTransactionModalProps) {
  const { addManualTransaction } = useFinance();

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [title, setTitle] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('food');
  const [selectedBank, setSelectedBank] = useState<string>('Nubank');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = () => {
    setErrorMsg('');
    const parsedAmount = parseFloat(amountRaw.replace(',', '.')) || 0;

    if (parsedAmount <= 0) {
      setErrorMsg('Informe um valor maior que zero.');
      return;
    }

    addManualTransaction({
      title: title.trim(),
      amount: parsedAmount,
      type,
      category: selectedCategory,
      bankName: selectedBank,
      note: note.trim() || undefined,
    });

    // Limpa os campos e fecha
    setTitle('');
    setAmountRaw('');
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
            <Text style={styles.headerLabel}>NOVO LANÇAMENTO</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeCircle}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.mainTitle}>Registrar Transação</Text>

          {/* Seletor Tipo: Despesa vs Receita */}
          <View style={styles.typeSwitcher}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'EXPENSE' && styles.typeBtnExpenseActive]}
              onPress={() => setType('EXPENSE')}>
              <Text style={[styles.typeBtnText, type === 'EXPENSE' && styles.typeBtnTextExpense]}>
                ↓ DESPESA
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'INCOME' && styles.typeBtnIncomeActive]}
              onPress={() => setType('INCOME')}>
              <Text style={[styles.typeBtnText, type === 'INCOME' && styles.typeBtnTextIncome]}>
                ↑ RECEITA
              </Text>
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠ {errorMsg}</Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Valor */}
            <Text style={styles.fieldLabel}>VALOR</Text>
            <View style={styles.amountInputRow}>
              <Text style={[styles.currencyPrefix, type === 'INCOME' && styles.currencyPrefixIncome]}>
                R$
              </Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0,00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={amountRaw}
                onChangeText={setAmountRaw}
              />
            </View>

            {/* Descrição */}
            <Text style={styles.fieldLabel}>DESCRIÇÃO / ESTABELECIMENTO</Text>
            <TextInput
              style={styles.textInput}
              placeholder={type === 'EXPENSE' ? 'Ex: Padaria, Supermercado...' : 'Ex: Salário, Pix...'}
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Instituição / Banco */}
            <Text style={styles.fieldLabel}>BANCO OU MÉTODO</Text>
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

            {/* Categoria */}
            <Text style={styles.fieldLabel}>CATEGORIA</Text>
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

            {/* Observação Opcional */}
            <Text style={styles.fieldLabel}>OBSERVAÇÃO (OPCIONAL)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Adicione um detalhe sobre este gasto..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={2}
              value={note}
              onChangeText={setNote}
            />

            <TouchableOpacity style={styles.saveButton} activeOpacity={0.85} onPress={handleSave}>
              <Text style={styles.saveButtonText}>CONFIRMAR LANÇAMENTO</Text>
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
  mainTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 4, marginBottom: 12 },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  typeBtnExpenseActive: { backgroundColor: 'rgba(248, 113, 113, 0.2)' },
  typeBtnIncomeActive: { backgroundColor: 'rgba(198, 241, 53, 0.2)' },
  typeBtnText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
  typeBtnTextExpense: { color: Colors.expense, fontWeight: '800' },
  typeBtnTextIncome: { color: Colors.primary, fontWeight: '800' },
  errorBanner: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: { color: Colors.expense, fontSize: 12, fontWeight: '600' },
  scrollBody: { paddingBottom: 30 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginTop: 10, marginBottom: 6 },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currencyPrefix: { color: Colors.expense, fontSize: 22, fontWeight: '800', marginRight: 8 },
  currencyPrefixIncome: { color: Colors.primary },
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
  textArea: { height: 60, textAlignVertical: 'top', paddingTop: 8 },
  horizontalChips: { flexDirection: 'row', marginBottom: 4 },
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
  categoryCardSelected: { backgroundColor: '#16232b' },
  categoryIndicator: { width: 10, height: 10, borderRadius: 5, marginBottom: 6 },
  categoryCardLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '500', textAlign: 'center' },
  categoryCardLabelSelected: { color: Colors.textPrimary, fontWeight: '700' },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  saveButtonText: { color: '#000000', fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
});