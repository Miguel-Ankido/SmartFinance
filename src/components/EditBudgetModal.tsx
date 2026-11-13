import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Colors } from '../theme/colors';
import { CategoryData } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

interface EditBudgetModalProps {
  category: CategoryData | null;
  onClose: () => void;
}

export default function EditBudgetModal({ category, onClose }: EditBudgetModalProps) {
  const { updateCategoryBudget, categories } = useFinance();
  const { user } = useAuth();
  const userIncome = user?.monthlyIncome && user.monthlyIncome > 0 ? user.monthlyIncome : 0;
  const [newLimitStr, setNewLimitStr] = useState('');

  useEffect(() => {
    if (category) {
      setNewLimitStr(category.budgetLimit > 0 ? category.budgetLimit.toString() : '');
    }
  }, [category]);

  if (!category) return null;

  const currentLimit = category.budgetLimit;
  const currentSpent = category.spent;
  const parsedLimit = parseFloat(newLimitStr.replace(',', '.')) || 0;
  const remainingWithNewLimit = Math.max(0, parsedLimit - currentSpent);
  const isOverBudget = parsedLimit > 0 && currentSpent > parsedLimit;

  // Cálculo da soma com as outras categorias vs renda do usuário
  const otherCategoriesTotal = categories
    .filter(c => c.id !== category.id)
    .reduce((sum, c) => sum + (c.budgetLimit || 0), 0);
  const newTotalLimit = otherCategoriesTotal + parsedLimit;
  const exceedsIncome = userIncome > 0 && newTotalLimit > userIncome;

  const handleAddQuick = (increment: number) => {
    const current = parseFloat(newLimitStr.replace(',', '.')) || 0;
    setNewLimitStr((current + increment).toString());
  };

  const handleSave = () => {
    if (parsedLimit < 0) return;
    if (exceedsIncome) {
      Alert.alert(
        'Limite Superior à Renda',
        `A soma de todos os limites (R$ ${newTotalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) ultrapassará sua renda mensal cadastrada de R$ ${userIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Reduza este limite para salvar.`,
      );
      return;
    }
    updateCategoryBudget(category.id, parsedLimit);
    onClose();
  };

  return (
    <Modal visible={!!category} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        {/* Toque fora do cartão para fechar */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.tagLabel}>GESTÃO DE METAS</Text>
              <Text style={styles.categoryTitle}>{category.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Cartão de Estado Atual */}
          <View style={styles.statusBox}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>GASTO ATUAL NESTE MÊS</Text>
              <Text style={styles.spentValue}>
                {currentSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>TETO ANTERIOR</Text>
              <Text style={styles.limitValue}>
                {currentLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
          </View>

          {/* Campo de Entrada */}
          <Text style={styles.fieldLabel}>NOVO LIMITE MENSAL</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currencyPrefix}>R$</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              value={newLimitStr}
              onChangeText={setNewLimitStr}
            />
          </View>

          {/* Atalhos Rápidos */}
          <View style={styles.quickButtonsRow}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => handleAddQuick(100)}>
              <Text style={styles.quickBtnText}>+ R$ 100</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => handleAddQuick(200)}>
              <Text style={styles.quickBtnText}>+ R$ 200</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => handleAddQuick(500)}>
              <Text style={styles.quickBtnText}>+ R$ 500</Text>
            </TouchableOpacity>
          </View>

          {/* Alerta de Ultrapassagem da Renda */}
          {exceedsIncome && (
            <View style={styles.incomeWarningCard}>
              <Text style={styles.incomeWarningTitle}>⚠️ LIMITE EXCEDE RENDA MENSAL</Text>
              <Text style={styles.incomeWarningText}>
                Com este valor, o orçamento total será de {newTotalLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, ultrapassando sua renda mensal de {userIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} em {(newTotalLimit - userIncome).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.
              </Text>
            </View>
          )}

          {/* Previsão do Impacto */}
          <View style={[styles.previewCard, isOverBudget && styles.previewCardAlert]}>
            <Text style={styles.previewText}>
              {isOverBudget
                ? `Atenção: Os gastos atuais já ultrapassam o novo teto em ${(currentSpent - parsedLimit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
                : `Margem disponível após ajuste: ${remainingWithNewLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`}
            </Text>
          </View>

          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={handleSave}>
            <Text style={styles.saveBtnText}>CONFIRMAR NOVO LIMITE</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleGroup: { gap: 2 },
  tagLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  categoryTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800' },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: Colors.textSecondary, fontSize: 13 },
  statusBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  statusItem: { flex: 1 },
  statusLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  spentValue: { color: Colors.expense, fontSize: 15, fontWeight: '800' },
  limitValue: { color: Colors.textPrimary, fontSize: 15, fontWeight: '800' },
  fieldLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 52,
    marginBottom: 12,
  },
  currencyPrefix: { color: Colors.primary, fontSize: 20, fontWeight: '800', marginRight: 8 },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceCard,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  incomeWarningCard: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  incomeWarningTitle: {
    color: Colors.expense,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  incomeWarningText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  previewCard: {
    backgroundColor: Colors.primaryMuted,
    padding: 12,
    borderRadius: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  previewCardAlert: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  previewText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '600', lineHeight: 17 },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
});