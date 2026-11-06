import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/colors';
import { MonitoredBank } from '../../types/finance';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import {
  getAvailableBanks,
  saveAndSyncMonitoredBanks,
  ADB_SHELL_BANK,
} from '../../services/bankMonitorService';

interface BanksStepProps {
  onBack: () => void;
  onFinish: () => void;
}

export default function BanksStep({ onBack, onFinish }: BanksStepProps) {
  const { user } = useAuth();
  const { hasPermission, requestPermission } = useFinance();
  const isAdmin = user?.role === 'admin';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [banks, setBanks] = useState<MonitoredBank[]>(() => {
    return getAvailableBanks(isAdmin);
  });
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleToggleBank = (id: string, enabled: boolean) => {
    setBanks(prev =>
      prev.map(b => (b.id === id ? { ...b, isEnabled: enabled } : b))
    );
  };

  const handleToggleAll = (enableAll: boolean) => {
    setBanks(prev => prev.map(b => ({ ...b, isEnabled: enableAll })));
  };

  const handleCompleteSetup = async () => {
    try {
      setIsFinishing(true);
      // Salva preferências e envia para o módulo nativo Android
      await saveAndSyncMonitoredBanks(banks);
      onFinish();
    } catch (e) {
      console.error('Erro ao salvar bancos no Onboarding:', e);
      onFinish();
    } finally {
      setIsFinishing(false);
    }
  };

  const activeCount = banks.filter(b => b.isEnabled).length;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cabeçalho */}
        <View style={styles.headerBlock}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagBadgeText}>PASSO 3 DE 3</Text>
          </View>
          <Text style={styles.mainTitle}>Quem trabalha por si?</Text>
          <Text style={styles.subtitle}>
            Selecione quais bancos devemos monitorar via notificação para capturar despesas automaticamente.
          </Text>
        </View>

        {/* Card de Permissão de Leitura de Notificações */}
        <View style={[styles.permissionCard, hasPermission && styles.permissionCardActive]}>
          <View style={styles.permissionLeft}>
            <View style={[styles.permissionIconCircle, hasPermission && styles.permissionIconCircleActive]}>
              <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={hasPermission ? '#000000' : Colors.primary} strokeWidth="2.2">
                <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </Svg>
            </View>
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionTitle}>Acesso a Notificações</Text>
              <Text style={styles.permissionStatusText}>
                {hasPermission ? '✓ Permissão concedida e ativa' : 'Necessário para captura passiva'}
              </Text>
            </View>
          </View>

          {!hasPermission ? (
            <TouchableOpacity
              style={styles.permissionBtn}
              activeOpacity={0.8}
              onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>HABILITAR</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeCheckBadge}>
              <Text style={styles.activeCheckText}>OK</Text>
            </View>
          )}
        </View>

        {/* Barra de Controles Rápidos */}
        <View style={styles.quickBar}>
          <Text style={styles.counterText}>
            <Text style={styles.counterHighlight}>{activeCount}</Text> de {banks.length} bancos ativos
          </Text>
          <View style={styles.quickButtons}>
            <TouchableOpacity onPress={() => handleToggleAll(true)} style={styles.quickBtn}>
              <Text style={styles.quickBtnText}>Ativar Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleToggleAll(false)} style={styles.quickBtn}>
              <Text style={styles.quickBtnText}>Desativar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista de Bancos com Toggles */}
        <View style={styles.banksList}>
          {banks.map(bank => {
            const isShell = bank.packageName === ADB_SHELL_BANK.packageName;

            return (
              <View key={bank.id} style={[styles.bankRow, isShell && styles.adminBankRow]}>
                <View style={styles.bankLeft}>
                  <View style={[styles.bankColorDot, { backgroundColor: bank.color }]} />
                  <View style={styles.bankNameCol}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.bankName}>{bank.name}</Text>
                      {isShell && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>ADMIN</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.bankPackage}>{bank.packageName}</Text>
                  </View>
                </View>

                <Switch
                  value={bank.isEnabled}
                  onValueChange={val => handleToggleBank(bank.id, val)}
                  trackColor={{ false: '#1c2830', true: Colors.primaryMuted }}
                  thumbColor={bank.isEnabled ? Colors.primary : '#4b5b65'}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Botões de Rodapé */}
      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={onBack}>
          <Text style={styles.backButtonText}>← VOLTAR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.finishButton, isFinishing && styles.buttonDisabled]}
          activeOpacity={0.85}
          disabled={isFinishing}
          onPress={handleCompleteSetup}>
          <Text style={styles.finishButtonText}>
            {isFinishing ? 'A CONCLUIR...' : 'CONCLUIR SETUP ✓'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  tagBadge: {
    backgroundColor: 'rgba(198, 241, 53, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(198, 241, 53, 0.25)',
  },
  tagBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  mainTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },

  /* Card de Permissão */
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceCard,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(198, 241, 53, 0.3)',
    marginBottom: 14,
  },
  permissionCardActive: {
    borderColor: 'rgba(52, 211, 153, 0.4)',
    backgroundColor: 'rgba(52, 211, 153, 0.06)',
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  permissionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(198, 241, 53, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionIconCircleActive: {
    backgroundColor: Colors.primary,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  permissionStatusText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permissionBtnText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeCheckBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeCheckText: {
    color: Colors.income,
    fontSize: 11,
    fontWeight: '800',
  },

  /* Barra rápida */
  quickBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  counterText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  counterHighlight: {
    color: Colors.primary,
    fontWeight: '800',
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickBtnText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },

  /* Lista de Bancos */
  banksList: {
    gap: 8,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adminBankRow: {
    borderColor: 'rgba(76, 175, 80, 0.4)',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
  },
  bankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bankColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bankNameCol: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  adminBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bankPackage: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  /* Rodapé */
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: Colors.surfaceCard,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  finishButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  finishButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
