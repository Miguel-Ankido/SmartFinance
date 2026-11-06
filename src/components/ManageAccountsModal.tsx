import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { useFinance } from '../context/FinanceContext';
import { Account, AccountType } from '../types/finance';

interface ManageAccountsModalProps {
  visible: boolean;
  onClose: () => void;
}

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: string }[] = [
  { type: 'CHECKING', label: 'Conta Corrente', icon: '🏦' },
  { type: 'CREDIT_CARD', label: 'Cartão de Crédito', icon: '💳' },
  { type: 'INVESTMENT', label: 'Investimentos', icon: '📈' },
  { type: 'CASH', label: 'Dinheiro / Carteira', icon: '💵' },
];

const COLOR_PALETTE = [
  '#c6f135', // Neon Verde
  '#34d399', // Esmeralda
  '#38bdf8', // Azul Claro
  '#a855f7', // Roxo
  '#f59e0b', // Âmbar
  '#f43f5e', // Rosa/Vermelho
  '#ffffff', // Branco
];

export default function ManageAccountsModal({ visible, onClose }: ManageAccountsModalProps) {
  const { accounts, addAccount, updateAccount, deleteAccount } = useFinance();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Campos do formulário
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [color, setColor] = useState('#c6f135');
  const [balanceRaw, setBalanceRaw] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setName('');
    setType('CHECKING');
    setColor('#c6f135');
    setBalanceRaw('');
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setColor(acc.color || '#c6f135');
    const initialBal = acc.initialBalance ?? acc.initial_balance ?? 0;
    setBalanceRaw(initialBal > 0 ? initialBal.toString() : '');
    setErrorMessage('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
    setErrorMessage('');
  };

  const handleSaveAccount = async () => {
    setErrorMessage('');
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Informe o nome da conta ou carteira.');
      return;
    }

    const parsedBalance = parseFloat(balanceRaw.replace(',', '.')) || 0;

    try {
      if (editingAccount) {
        await updateAccount({
          ...editingAccount,
          name: trimmedName,
          type,
          color,
          initialBalance: parsedBalance,
          initial_balance: parsedBalance,
        });
      } else {
        await addAccount({
          name: trimmedName,
          type,
          color,
          icon: ACCOUNT_TYPES.find(t => t.type === type)?.icon || '🏦',
          initialBalance: parsedBalance,
          initial_balance: parsedBalance,
          isActive: true,
          is_active: true,
        });
      }
      handleCloseForm();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao salvar carteira.');
    }
  };

  const handleDeleteAccount = (acc: Account) => {
    Alert.alert(
      'Remover Carteira',
      `Deseja realmente remover a conta "${acc.name}"? As transações vinculadas serão preservadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(acc.id);
            } catch (err: any) {
              Alert.alert('Erro', err?.message || 'Falha ao excluir carteira.');
            }
          },
        },
      ],
    );
  };

  const getTypeName = (accType: AccountType) => {
    return ACCOUNT_TYPES.find(t => t.type === accType)?.label || accType;
  };

  const getTypeIcon = (accType: AccountType) => {
    return ACCOUNT_TYPES.find(t => t.type === accType)?.icon || '🏦';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.topBar}>
            <Text style={styles.headerLabel}>CARTEIRAS & CONTAS</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeCircle}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.mainTitle}>Gestão de Carteiras</Text>
          <Text style={styles.mainSubtitle}>
            Cadastre suas contas bancárias, cartões e carteiras para organizar seus lançamentos.
          </Text>

          {/* Botão de Adicionar Nova Conta */}
          {!isFormOpen && (
            <TouchableOpacity
              style={styles.newAccountBtn}
              activeOpacity={0.8}
              onPress={handleOpenCreate}>
              <Text style={styles.newAccountBtnIcon}>＋</Text>
              <Text style={styles.newAccountBtnText}>NOVA CONTA / CARTEIRA</Text>
            </TouchableOpacity>
          )}

          {/* Formulário de Criação/Edição */}
          {isFormOpen && (
            <View style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <Text style={styles.formTitle}>
                  {editingAccount ? 'Editar Conta' : 'Nova Carteira ou Conta'}
                </Text>
                <TouchableOpacity onPress={handleCloseForm}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠ {errorMessage}</Text>
                </View>
              ) : null}

              {/* Nome */}
              <Text style={styles.inputLabel}>NOME DA CONTA</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Nubank, Inter, Dinheiro Carteira..."
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              {/* Tipo de Conta */}
              <Text style={styles.inputLabel}>TIPO DE CONTA</Text>
              <View style={styles.typeGrid}>
                {ACCOUNT_TYPES.map(t => {
                  const isSelected = type === t.type;
                  return (
                    <TouchableOpacity
                      key={t.type}
                      style={[styles.typeChip, isSelected && styles.typeChipActive]}
                      onPress={() => setType(t.type)}>
                      <Text style={styles.typeChipIcon}>{t.icon}</Text>
                      <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Seletor de Cores */}
              <Text style={styles.inputLabel}>COR DE IDENTIFICAÇÃO</Text>
              <View style={styles.colorsRow}>
                {COLOR_PALETTE.map(c => {
                  const isSelected = color === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        isSelected && styles.colorCircleSelected,
                      ]}
                      onPress={() => setColor(c)}
                    />
                  );
                })}
              </View>

              {/* Saldo Inicial */}
              <Text style={styles.inputLabel}>SALDO INICIAL (OPCIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0,00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={balanceRaw}
                onChangeText={setBalanceRaw}
              />

              {/* Botão Salvar */}
              <TouchableOpacity
                style={styles.saveBtn}
                activeOpacity={0.85}
                onPress={handleSaveAccount}>
                <Text style={styles.saveBtnText}>
                  {editingAccount ? 'SALVAR ALTERAÇÕES' : 'CRIAR CARTEIRA'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de Contas */}
          <Text style={styles.sectionHeader}>
            SUAS CONTAS CADASTRADAS ({accounts.length})
          </Text>

          <ScrollView
            style={styles.accountsScroll}
            contentContainerStyle={styles.accountsScrollContent}
            showsVerticalScrollIndicator={false}>
            {accounts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💳</Text>
                <Text style={styles.emptyTitle}>Nenhuma carteira encontrada</Text>
                <Text style={styles.emptySubtitle}>
                  Adicione suas contas bancárias e carteiras para vincular às suas transações manuais.
                </Text>
              </View>
            ) : (
              accounts.map(acc => {
                const bal = acc.initialBalance ?? acc.initial_balance ?? 0;
                return (
                  <View key={acc.id} style={styles.accountCard}>
                    <View style={styles.accountCardLeft}>
                      <View style={[styles.accountColorDot, { backgroundColor: acc.color || Colors.primary }]}>
                        <Text style={styles.accountIconText}>{getTypeIcon(acc.type)}</Text>
                      </View>
                      <View>
                        <Text style={styles.accountName}>{acc.name}</Text>
                        <View style={styles.typeBadgeRow}>
                          <Text style={styles.accountTypeBadge}>{getTypeName(acc.type)}</Text>
                          {bal > 0 ? (
                            <Text style={styles.initialBalanceText}>
                              Inicial: {bal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => handleOpenEdit(acc)}>
                        <Text style={styles.actionIconText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionIconButton}
                        onPress={() => handleDeleteAccount(acc)}>
                        <Text style={styles.actionIconDeleteText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLabel: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  mainTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  mainSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  newAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  newAccountBtnIcon: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  newAccountBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  cancelText: {
    color: Colors.expense,
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: Colors.expense,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  errorText: {
    color: Colors.expense,
    fontSize: 12,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  typeChipIcon: {
    fontSize: 14,
  },
  typeChipText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  colorCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    color: '#070b0e',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  accountsScroll: {
    maxHeight: 280,
  },
  accountsScrollContent: {
    paddingBottom: 16,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 17,
  },
  accountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  accountCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  accountColorDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountIconText: {
    fontSize: 16,
  },
  accountName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  accountTypeBadge: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  initialBalanceText: {
    color: Colors.income,
    fontSize: 11,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconText: {
    fontSize: 13,
  },
  actionIconDeleteText: {
    fontSize: 13,
  },
});
