import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  adminService,
  type HealthMetrics,
  type LocalDeviceHealth,
  type SystemOverview,
} from '../services/adminService';
import { Colors } from '../theme/colors';

interface AdminDashboardScreenProps {
  onClose: () => void;
}

const emptyOverview: SystemOverview = {
  totalUsers: 0,
  totalCloudTransactions: 0,
  supabaseOnline: false,
  apiLatencyMs: null,
};

const emptyHealth: HealthMetrics = {
  parserMetrics: [],
  blockedSecurityEvents: 0,
  averageLatencyMs: null,
};

const emptyLocalHealth: LocalDeviceHealth = {
  sqliteHealthy: false,
  pendingSyncTransactions: 0,
  checkedAt: '',
};

function formatLatency(value: number | null): string {
  return value === null ? '--' : `${value} ms`;
}

export default function AdminDashboardScreen({ onClose }: AdminDashboardScreenProps) {
  const { user } = useAuth();
  const [overview, setOverview] = useState<SystemOverview>(emptyOverview);
  const [health, setHealth] = useState<HealthMetrics>(emptyHealth);
  const [localHealth, setLocalHealth] = useState<LocalDeviceHealth>(emptyLocalHealth);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMetrics = useCallback(async () => {
    if (!user || user.role !== 'admin') {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const [nextOverview, nextHealth, nextLocalHealth] = await Promise.all([
        adminService.fetchSystemOverview(),
        adminService.fetchHealthMetrics(),
        adminService.fetchLocalDeviceHealth(user.id),
      ]);

      setOverview(nextOverview);
      setHealth(nextHealth);
      setLocalHealth(nextLocalHealth);

      if (nextOverview.supabaseOnline) {
        await adminService.reportDeviceHealth({
          sqliteHealthy: nextLocalHealth.sqliteHealthy,
          pendingSyncTransactions: nextLocalHealth.pendingSyncTransactions,
        });
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load system metrics.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleBankPing = async () => {
    const ping = await adminService.testBankPing();
    Alert.alert(
      'Teste de integracoes',
      ping.online
        ? `Supabase respondeu em ${ping.latencyMs ?? 0} ms.`
        : 'A nuvem nao esta disponivel ou o Supabase ainda nao foi configurado.',
    );
  };

  if (user?.role !== 'admin') {
    return (
      <View style={styles.deniedContainer}>
        <Text style={styles.deniedTitle}>Acesso restrito</Text>
        <Text style={styles.deniedDescription}>
          Este painel esta disponivel apenas para administradores autorizados.
        </Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
          <Text style={styles.secondaryButtonText}>Voltar ao perfil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const parserMetrics =
    health.parserMetrics.length > 0
      ? health.parserMetrics
      : [
          { parserName: 'Nubank', successRate: 0, averageLatencyMs: 0, recordedAt: '' },
          { parserName: 'PicPay', successRate: 0, averageLatencyMs: 0, recordedAt: '' },
          { parserName: 'Banco Inter', successRate: 0, averageLatencyMs: 0, recordedAt: '' },
        ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>ADMINISTRACAO</Text>
          <Text style={styles.title}>Saude do sistema</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Fechar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, overview.supabaseOnline ? styles.statusOnline : styles.statusOffline]} />
        <Text style={styles.statusText}>
          {overview.supabaseOnline ? 'Sistema operacional / Online' : 'Sistema local / Nuvem indisponivel'}
        </Text>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saude do sistema</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Latencia API Supabase</Text>
          <Text style={styles.metricValue}>{formatLatency(overview.apiLatencyMs)}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>SQLite local</Text>
          <Text style={[styles.metricValue, localHealth.sqliteHealthy ? styles.goodValue : styles.warningValue]}>
            {localHealth.sqliteHealthy ? 'Integro' : 'Indisponivel'}
          </Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Fila de sincronizacao</Text>
          <Text style={styles.metricValue}>{localHealth.pendingSyncTransactions} pendentes</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Seguranca e conformidade</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>2FA e senhas bloqueados</Text>
          <Text style={styles.metricValue}>{health.blockedSecurityEvents}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Politica de telemetria</Text>
          <Text style={[styles.metricValue, styles.goodValue]}>Zero-PII</Text>
        </View>
        <Text style={styles.cardHint}>
          Apenas contagens e indicadores tecnicos agregados sao enviados para a nuvem.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Telemetria dos parsers</Text>
        {parserMetrics.map(metric => (
          <View key={metric.parserName} style={styles.parserRow}>
            <View style={styles.parserTitleRow}>
              <Text style={styles.metricLabel}>{metric.parserName}</Text>
              <Text style={styles.metricValue}>{metric.successRate}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, metric.successRate)}%` }]} />
            </View>
            <Text style={styles.parserLatency}>{metric.averageLatencyMs} ms por leitura</Text>
          </View>
        ))}
        <Text style={styles.cardHint}>Latencia media consolidada: {formatLatency(health.averageLatencyMs)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Volume sincronizado</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Utilizadores</Text>
          <Text style={styles.metricValue}>{overview.totalUsers}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Transacoes na nuvem</Text>
          <Text style={styles.metricValue}>{overview.totalCloudTransactions}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        activeOpacity={0.8}
        onPress={handleBankPing}
        disabled={isLoading}>
        <Text style={styles.primaryButtonText}>Testar ping do banco</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        activeOpacity={0.8}
        onPress={loadMetrics}
        disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Text style={styles.secondaryButtonText}>Recarregar metricas</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { color: Colors.textPrimary, fontSize: 24, fontWeight: '800', marginTop: 4 },
  closeButton: { paddingVertical: 8, paddingHorizontal: 10 },
  closeButtonText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 18 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusOnline: { backgroundColor: Colors.income },
  statusOffline: { backgroundColor: Colors.expense },
  statusText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  errorText: { color: Colors.expense, fontSize: 12, marginBottom: 12 },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 8,
    borderColor: Colors.border,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  cardHint: { color: Colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 8 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  metricLabel: { color: Colors.textSecondary, fontSize: 13 },
  metricValue: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  goodValue: { color: Colors.income },
  warningValue: { color: Colors.expense },
  parserRow: { paddingVertical: 8 },
  parserTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTrack: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, marginTop: 7 },
  progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  parserLatency: { color: Colors.textMuted, fontSize: 10, marginTop: 5 },
  primaryButton: {
    minHeight: 46,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: Colors.background, fontSize: 14, fontWeight: '800' },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryButtonText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  deniedContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  deniedTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800' },
  deniedDescription: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 },
});
