import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Transaction, CategoryId, TransactionType } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import { BANK_CONFIGS } from '../utils/bankColors';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  visible: boolean;
  onClose: () => void;
  onSaved?: (updated: Transaction) => void;
}

const CATEGORY_OPTIONS: { id: CategoryId; label: string; color: string }[] = [
  { id: 'food', label: 'Alimentação', color: Colors.catFood },
  { id: 'transport', label: 'Transporte', color: Colors.catTransport },
  { id: 'entertainment', label: 'Lazer', color: Colors.catEntertainment },
  { id: 'bills', label: 'Contas Fixas', color: Colors.catBills },
  { id: 'shopping', label: 'Compras', color: Colors.catShopping },
  { id: 'salary', label: 'Salário', color: Colors.catIncome },
  { id: 'others', label: 'Outros', color: Colors.textSecondary },
];

function formatDateToInput(timestamp: number): string {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseInputDate(dateStr: string, originalTimestamp: number): number {
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year >= 2000 && year <= 2100) {
      const orig = new Date(originalTimestamp);
      const newDate = new Date(year, month, day, orig.getHours(), orig.getMinutes(), orig.getSeconds());
      if (!isNaN(newDate.getTime())) {
        return newDate.getTime();
      }
    }
  }
  return originalTimestamp;
}

export default function EditTransactionModal({
  transaction,
  visible,
  onClose,
  onSaved,
}: EditTransactionModalProps) {
  const { updateTransaction, deleteTransaction, accounts } = useFinance();

  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [title, setTitle] = useState('');
  const [amountRaw, setAmountRaw] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('food');
  const [selectedBank, setSelectedBank] = useState<string>('Nubank');
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setTitle(transaction.title);
      setAmountRaw(transaction.amount.toString().replace('.', ','));
      setDateStr(formatDateToInput(transaction.timestamp));
      setSelectedCategory(transaction.category);
      setSelectedBank(transaction.bankName);
      setSelectedAccountId(transaction.accountId || transaction.account_id || undefined);
      setNote(transaction.note || '');
      setErrorMsg('');
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleQuickDate = (mode: 'TODAY' | 'YESTERDAY') => {
    const now = new Date();
    if (mode === 'YESTERDAY') {
      now.setDate(now.getDate() - 1);
    }
    setDateStr(formatDateToInput(now.getTime()));
  };

  const handleSave = async () => {
    setErrorMsg('');
    const numericAmount = parseFloat(amountRaw.replace(',', '.')) || 0;

    if (numericAmount <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Informe a descrição ou estabelecimento.');
      return;
    }

    try {
      setIsSaving(true);
      const newTimestamp = parseInputDate(dateStr, transaction.timestamp);
      const d = new Date(newTimestamp);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const timeFormatted = `${hours}:${mins}`;
      const dateFormatted = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });

      const updated: Transaction = {
        ...transaction,
        type,
        title: title.trim(),
        amount: numericAmount,
        category: selectedCategory,
        bankName: selectedBank,
        accountId: selectedAccountId,
        account_id: selectedAccountId,
        note: note.trim() || undefined,
        timestamp: newTimestamp,
        timeFormatted,
        dateFormatted,
      };

      await updateTransaction(updated);
      onSaved?.(updated);
      onClose();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erro ao salvar alterações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Transação',
      `Tem certeza que deseja excluir "${transaction.title}" no valor de ${transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}? Esta ação realizará o Soft Delete e atualizará o Supabase.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id);
              onClose();
            } catch (err: any) {
              Alert.alert('Erro', 'Não foi possível excluir a transação: ' + err?.message);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.topBar}>
            <Text style={styles.headerLabel}>GESTÃO DE TRANSAÇÃO</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeCircle}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.mainTitle}>Editar Lançamento</Text>

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
            {/* Montante / Valor */}
            <Text style={styles.fieldLabel}>VALOR DA TRANSAÇÃO</Text>
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

            {/* Descrição / Estabelecimento */}
            <Text style={styles.fieldLabel}>DESCRIÇÃO / ESTABELECIMENTO</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nome do estabelecimento ou identificador..."
              placeholderTextColor={Colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Data da Transação */}
            <View style={styles.dateLabelRow}>
              <Text style={styles.fieldLabel}>DATA (DD/MM/AAAA)</Text>
              <View style={styles.quickDateRow}>
                <TouchableOpacity style={styles.quickDateBtn} onPress={() => handleQuickDate('TODAY')}>
                  <Text style={styles.quickDateText}>Hoje</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickDateBtn} onPress={() => handleQuickDate('YESTERDAY')}>
                  <Text style={styles.quickDateText}>Ontem</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: 05/11/2026"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              value={dateStr}
              onChangeText={setDateStr}
            />

            {/* Carteira / Conta (account_id) */}
            {accounts.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>CARTEIRA / CONTA VINCULADA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
                  <TouchableOpacity
                    style={[styles.accountChip, !selectedAccountId && styles.accountChipActive]}
                    onPress={() => setSelectedAccountId(undefined)}>
                    <Text style={[styles.accountChipText, !selectedAccountId && styles.accountChipTextActive]}>
                      Padrão (Sem Conta)
                    </Text>
                  </TouchableOpacity>
                  {accounts.map(acc => {
                    const isSelected = selectedAccountId === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        style={[
                          styles.accountChip,
                          isSelected && styles.accountChipActive,
                          isSelected && { borderColor: acc.color || Colors.primary },
                        ]}
                        onPress={() => {
                          setSelectedAccountId(acc.id);
                          if (acc.bank) {
                            setSelectedBank(acc.bank);
                          } else {
                            setSelectedBank(acc.name);
                          }
                        }}>
                        <View style={[styles.accountDot, { backgroundColor: acc.color || Colors.primary }]} />
                        <Text style={[styles.accountChipText, isSelected && styles.accountChipTextActive]}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

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

            {/* Instituição Bancária com Cores da Marca */}
            <Text style={styles.fieldLabel}>INSTITUIÇÃO BANCÁRIA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              {BANK_CONFIGS.map(bank => {
                const isSelected = selectedBank === bank.name;
                return (
                  <TouchableOpacity
                    key={bank.name}
                    style={[
                      styles.bankChip,
                      isSelected && {
                        backgroundColor: bank.color,
                        borderColor: bank.color,
                      },
                    ]}
                    onPress={() => setSelectedBank(bank.name)}>
                    <View
                      style={[
                        styles.bankDot,
                        { backgroundColor: bank.color },
                        isSelected && { backgroundColor: bank.textColor },
                      ]}
                    />
                    <Text
                      style={[
                        styles.bankChipText,
                        isSelected && { color: bank.textColor, fontWeight: '800' },
                      ]}>
                      {bank.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Observação */}
            <Text style={styles.fieldLabel}>OBSERVAÇÃO / NOTA</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Adicione ou altere sua anotação..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              value={note}
              onChangeText={setNote}
            />

            {/* Botões de Ação: Salvar e Excluir */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              activeOpacity={0.85}
              disabled={isSaving}
              onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              activeOpacity={0.8}
              onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>EXCLUIR TRANSAÇÃO 🗑</Text>
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
    maxHeight: '92%',
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

  /* Switcher Despesa / Receita */
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  typeBtnExpenseActive: { backgroundColor: 'rgba(248, 113, 113, 0.15)' },
  typeBtnIncomeActive: { backgroundColor: 'rgba(52, 211, 153, 0.15)' },
  typeBtnText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  typeBtnTextExpense: { color: Colors.expense, fontWeight: '800' },
  typeBtnTextIncome: { color: Colors.income, fontWeight: '800' },

  errorBanner: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  errorText: { color: Colors.expense, fontSize: 12, fontWeight: '600' },

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
  currencyPrefix: { color: Colors.expense, fontSize: 22, fontWeight: '800', marginRight: 8 },
  currencyPrefixIncome: { color: Colors.income },
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

  /* Data label and quick buttons */
  dateLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  quickDateRow: { flexDirection: 'row', gap: 6 },
  quickDateBtn: {
    backgroundColor: Colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickDateText: { color: Colors.primary, fontSize: 10, fontWeight: '700' },

  /* Carteira chips */
  horizontalChips: { flexDirection: 'row', marginBottom: 6 },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  accountChipActive: { backgroundColor: '#1c2830', borderColor: Colors.primary },
  accountDot: { width: 8, height: 8, borderRadius: 4 },
  accountChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  accountChipTextActive: { color: Colors.textPrimary, fontWeight: '800' },

  /* Bank chips */
  bankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  bankDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bankChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },

  /* Categorias grid */
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

  /* Buttons */
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  deleteButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  deleteButtonText: { color: Colors.expense, fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
});
