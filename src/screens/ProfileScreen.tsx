import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, NativeModules, Image, Switch } from 'react-native';
import { type NavigationProp, useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { MonitoredBank } from '../types/finance';
import type { RootStackParamList } from '../types/navigation';
import ManageBanksModal from '../components/ManageBanksModal';
import ManageAccountsModal from '../components/ManageAccountsModal';
import ExportReportModal from '../components/ExportReportModal';
import EditProfileModal from '../components/EditProfileModal';
import {
  loadAndSyncMonitoredBanks,
  saveAndSyncMonitoredBanks,
} from '../services/bankMonitorService';

const { NotificationModule } = NativeModules;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, logout, resetOnboarding } = useAuth();
  const isAdmin = user?.role === 'admin';
  const {
    hasPermission,
    requestPermission,
    transactions,
    accounts,
    isCaptureNotificationEnabled,
    setCaptureNotificationEnabled,
  } = useFinance();
  const [banks, setBanks] = useState<MonitoredBank[]>([]);
  const [isManageBanksOpen, setIsManageBanksOpen] = useState(false);
  const [isManageAccountsOpen, setIsManageAccountsOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const loadMonitoredBanks = useCallback(async () => {
    try {
      const list = await loadAndSyncMonitoredBanks(isAdmin);
      setBanks(list);
    } catch (e) {
      console.error('Erro ao ler bancos monitorados:', e);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadMonitoredBanks();
  }, [loadMonitoredBanks]);

  const handleToggleBank = (bankId: string, enabled: boolean) => {
    setBanks(prev => prev.map(b => (b.id === bankId ? { ...b, isEnabled: enabled } : b)));
  };

  const handleToggleAll = (enableAll: boolean) => {
    setBanks(prev => prev.map(b => ({ ...b, isEnabled: enableAll })));
  };

  const handleSaveBanks = async () => {
    try {
      await saveAndSyncMonitoredBanks(banks);
      if (NotificationModule?.setBankEnabled) {
        for (const b of banks) {
          if (b.packageName !== 'com.android.shell') {
            await NotificationModule.setBankEnabled(b.id, b.isEnabled, user?.id);
          }
        }
      }
    } catch (e) {
      console.error('Erro ao salvar preferências de bancos:', e);
    }
    setIsManageBanksOpen(false);
  };

  const activeBanks = banks.filter(b => b.isEnabled);
  const activeCount = activeBanks.length;
  const activeNames = activeBanks.map(b => b.name).slice(0, 3).join(', ') + (activeCount > 3 ? '...' : '');

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : 'Setembro de 2026';

  const handleLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja encerrar sua sessão no SmartFinance?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerSubtitle}>CONFIGURAÇÕES</Text>
        <Text style={styles.headerTitle}>Meu Perfil</Text>
      </View>

      {/* Card Principal do Usuário */}
      <View style={styles.userCard}>
        <TouchableOpacity
          style={styles.editProfileBtn}
          activeOpacity={0.7}
          onPress={() => setIsEditProfileOpen(true)}
          accessibilityLabel="Editar Perfil">
          <Text style={styles.editProfileIcon}>✏️</Text>
        </TouchableOpacity>

        {user?.avatarUrl ? (
          user.avatarUrl.startsWith('http://') || user.avatarUrl.startsWith('https://') ? (
            <View style={styles.avatarLargeImageWrapper}>
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            </View>
          ) : (
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarEmojiText}>{user.avatarUrl}</Text>
            </View>
          )
        ) : (
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarInitialText}>{userInitial}</Text>
          </View>
        )}
        <Text style={styles.userName}>{user?.name || 'Usuário SmartFinance'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'usuario@smartfinance.app'}</Text>

        <View style={styles.memberBadge}>
          <Text style={styles.memberBadgeText}>Membro desde {memberSince}</Text>
        </View>
      </View>

      {user?.role === 'admin' ? (
        <TouchableOpacity
          style={styles.adminCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AdminDashboard')}>
          <View>
            <Text style={styles.adminTitle}>Painel de Administração</Text>
            <Text style={styles.adminSubtitle}>Saúde do sistema, segurança e telemetria</Text>
          </View>
          <Text style={styles.adminAction}>ABRIR</Text>
        </TouchableOpacity>
      ) : null}

      {/* Seção de Relatórios e Exportação */}
      <Text style={styles.sectionTitle}>RELATÓRIOS E DADOS</Text>

      <TouchableOpacity
        style={styles.optionCard}
        activeOpacity={0.7}
        onPress={() => setIsExportModalOpen(true)}>
        <View style={styles.optionLeft}>
          <View style={styles.optionTitleRow}>
            <Text style={styles.optionTitle}>Exportar Extrato (CSV)</Text>
            <Text style={styles.badgeHint}>EXCEL / PLANILHAS ↗</Text>
          </View>
          <Text style={styles.optionSubtitle}>
            Baixe o extrato consolidado com categorias, datas e valores
          </Text>
        </View>
        <Text style={styles.exportBadge}>EXPORTAR</Text>
      </TouchableOpacity>

      {/* Seção de Preferências e Segurança */}
      <Text style={styles.sectionTitle}>SISTEMA E INTEGRAÇÕES</Text>

      {/* Status da Captura de Notificações */}
      <View style={styles.optionCard}>
        <View style={styles.optionLeft}>
          <Text style={styles.optionTitle}>Captura em Segundo Plano</Text>
          <Text style={styles.optionSubtitle}>
            {hasPermission ? 'Serviço ativo e interceptando alertas' : 'Acesso a notificações desativado'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.statusPill, hasPermission ? styles.pillActive : styles.pillInactive]}
          onPress={requestPermission}>
          <Text style={[styles.pillText, hasPermission && styles.pillTextActive]}>
            {hasPermission ? 'ATIVO' : 'HABILITAR'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alertas e Notificações do Próprio SyncPay */}
      <View style={styles.optionCard}>
        <View style={styles.optionLeft}>
          <View style={styles.optionTitleRow}>
            <Text style={styles.optionTitle}>Notificações do SyncPay</Text>
            <Text style={styles.badgeHint}>CONFIRMAÇÃO 🔔</Text>
          </View>
          <Text style={styles.optionSubtitle}>
            {isCaptureNotificationEnabled
              ? 'Receber notificação quando o app registrar um gasto'
              : 'Alertas de transações capturadas desativados'}
          </Text>
        </View>
        <Switch
          value={isCaptureNotificationEnabled}
          onValueChange={setCaptureNotificationEnabled}
          trackColor={{ false: '#1c2830', true: Colors.primaryMuted }}
          thumbColor={isCaptureNotificationEnabled ? Colors.primary : '#4b5b65'}
        />
      </View>

      {/* Bancos Monitorados */}
      <TouchableOpacity
        style={styles.optionCard}
        activeOpacity={0.7}
        onPress={() => setIsManageBanksOpen(true)}>
        <View style={styles.optionLeft}>
          <View style={styles.optionTitleRow}>
            <Text style={styles.optionTitle}>Bancos Monitorados</Text>
            <Text style={styles.badgeHint}>CONFIGURAR ✎</Text>
          </View>
          <Text style={styles.optionSubtitle}>
            {activeCount === 0 ? 'Nenhum banco monitorado' : activeNames}
          </Text>
        </View>
        <Text style={styles.optionValueText}>{activeCount} de {banks.length}</Text>
      </TouchableOpacity>

      {/* Carteiras e Contas (Épico 1) */}
      <TouchableOpacity
        style={styles.optionCard}
        activeOpacity={0.7}
        onPress={() => setIsManageAccountsOpen(true)}>
        <View style={styles.optionLeft}>
          <View style={styles.optionTitleRow}>
            <Text style={styles.optionTitle}>Minhas Carteiras & Contas</Text>
            <Text style={styles.badgeHint}>GERENCIAR ↗</Text>
          </View>
          <Text style={styles.optionSubtitle}>
            {accounts.length === 0
              ? 'Nenhuma conta cadastrada'
              : `${accounts.length} ${accounts.length === 1 ? 'conta ativa' : 'contas ativas'}`}
          </Text>
        </View>
        <Text style={styles.optionValueText}>{accounts.length}</Text>
      </TouchableOpacity>

      {/* Armazenamento Local */}
      <View style={styles.optionCard}>
        <View style={styles.optionLeft}>
          <Text style={styles.optionTitle}>Persistência Nativa</Text>
          <Text style={styles.optionSubtitle}>SQLite Offline (smartfinance.db)</Text>
        </View>
        <Text style={styles.optionSecureText}>SEGURO</Text>
      </View>

      {/* Rever Onboarding */}
      <TouchableOpacity
        style={styles.optionCard}
        activeOpacity={0.7}
        onPress={() => {
          Alert.alert(
            'Rever Onboarding',
            'Deseja reabrir o fluxo de configuração inicial do SyncPay?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Reabrir', onPress: () => resetOnboarding() },
            ]
          );
        }}>
        <View style={styles.optionLeft}>
          <View style={styles.optionTitleRow}>
            <Text style={styles.optionTitle}>Guia de Primeiro Acesso</Text>
            <Text style={styles.badgeHint}>ONBOARDING ↺</Text>
          </View>
          <Text style={styles.optionSubtitle}>
            Revisar apresentação e configurações recomendadas
          </Text>
        </View>
        <Text style={styles.optionValueText}>REVER</Text>
      </TouchableOpacity>

      {/* Botão de Logout */}
      <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>SAIR DA CONTA</Text>
      </TouchableOpacity>

      <ManageBanksModal
        visible={isManageBanksOpen}
        banks={banks}
        onToggleBank={handleToggleBank}
        onToggleAll={handleToggleAll}
        onDone={handleSaveBanks}
        onClose={handleSaveBanks}
      />

      <ManageAccountsModal
        visible={isManageAccountsOpen}
        onClose={() => setIsManageAccountsOpen(false)}
      />

      <ExportReportModal
        visible={isExportModalOpen}
        transactions={transactions}
        userName={user?.name}
        onClose={() => setIsExportModalOpen(false)}
      />

      <EditProfileModal
        visible={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginTop: 10, marginBottom: 18 },
  headerSubtitle: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginTop: 2 },
  userCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    position: 'relative',
  },
  editProfileBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  editProfileIcon: {
    fontSize: 14,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  avatarEmojiText: {
    fontSize: 30,
  },
  avatarInitialText: { color: '#000000', fontSize: 26, fontWeight: '900' },
  userName: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  userEmail: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
  adminCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  adminSubtitle: { color: Colors.textSecondary, fontSize: 11, marginTop: 4 },
  adminAction: { color: Colors.background, backgroundColor: Colors.primary, fontSize: 10, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  memberBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberBadgeText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
  sectionTitle: { color: Colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 12, marginTop: 8 },
  optionCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLeft: { flex: 1, marginRight: 10 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  badgeHint: { color: Colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  optionSubtitle: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  pillInactive: { backgroundColor: 'rgba(248, 113, 113, 0.12)', borderColor: Colors.expense },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: Colors.expense },
  pillTextActive: { color: Colors.primary },
  optionValueText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  optionSecureText: { color: Colors.income, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  exportBadge: {
    color: '#ffffff',
    backgroundColor: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtn: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  logoutBtnText: { color: Colors.expense, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
});
