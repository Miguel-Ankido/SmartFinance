import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { hasPermission, requestPermission } = useFinance();

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
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarInitialText}>{userInitial}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Usuário SmartFinance'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'usuario@smartfinance.app'}</Text>

        <View style={styles.memberBadge}>
          <Text style={styles.memberBadgeText}>Membro desde {memberSince}</Text>
        </View>
      </View>

      {/* Seção de Preferências e Segurança */}
      <Text style={styles.sectionTitle}>SISTEMA E INTEGRAÇÕES</Text>

      {/* Status da Captura de Notificações */}
      <View style={styles.optionCard}>
        <View style={styles.optionLeft}>
          <Text style={styles.optionTitle}>Captura em Segundo Plano</Text>
          <Text style={styles.optionSubtitle}>
            {hasPermission ? 'Serviço ativo e interceptando alertas bancários' : 'Acesso a notificações desativado'}
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

      {/* Bancos Monitorados */}
      <View style={styles.optionCard}>
        <View style={styles.optionLeft}>
          <Text style={styles.optionTitle}>Bancos Ativos</Text>
          <Text style={styles.optionSubtitle}>Nubank, PicPay, Inter, Itaú, Bradesco</Text>
        </View>
        <Text style={styles.optionValueText}>5 bancos</Text>
      </View>

      {/* Armazenamento Local */}
      <View style={styles.optionCard}>
        <View style={styles.optionLeft}>
          <Text style={styles.optionTitle}>Persistência Nativa</Text>
          <Text style={styles.optionSubtitle}>SQLite Offline (smartfinance.db)</Text>
        </View>
        <Text style={styles.optionSecureText}>SEGURO</Text>
      </View>

      {/* Botão de Logout */}
      <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>SAIR DA CONTA</Text>
      </TouchableOpacity>
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
  avatarInitialText: { color: '#000000', fontSize: 26, fontWeight: '900' },
  userName: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  userEmail: { color: Colors.textSecondary, fontSize: 13, marginTop: 4 },
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
  sectionTitle: { color: Colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 12 },
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
  optionTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  optionSubtitle: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillActive: { backgroundColor: 'rgba(198, 241, 53, 0.12)', borderColor: Colors.primary },
  pillInactive: { backgroundColor: 'rgba(248, 113, 113, 0.12)', borderColor: Colors.expense },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: Colors.expense },
  pillTextActive: { color: Colors.primary },
  optionValueText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  optionSecureText: { color: Colors.income, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
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