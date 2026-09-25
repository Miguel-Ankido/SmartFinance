import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Colors } from '../theme/colors';
import { MonitoredBank } from '../types/finance';

interface ManageBanksModalProps {
  visible: boolean;
  banks: MonitoredBank[];
  onToggleBank: (bankId: string, enabled: boolean) => void;
  onToggleAll: (enableAll: boolean) => void;
  onClose: () => void;
}

export default function ManageBanksModal({
  visible,
  banks,
  onToggleBank,
  onToggleAll,
  onClose,
}: ManageBanksModalProps) {
  const activeCount = banks.filter(b => b.isEnabled).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.tagLabel}>PREFERÊNCIAS DE CAPTURA</Text>
              <Text style={styles.title}>Bancos Monitorados</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Selecione quais aplicativos bancários o SmartFinance deve escutar para lançar despesas automaticamente.
          </Text>

          {/* Barra de Ações Rápidas */}
          <View style={styles.quickBar}>
            <Text style={styles.counterText}>
              <Text style={styles.counterHighlight}>{activeCount}</Text> de {banks.length} ativos
            </Text>
            <View style={styles.quickButtons}>
              <TouchableOpacity onPress={() => onToggleAll(true)} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>Ativar Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onToggleAll(false)} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>Desativar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de Bancos com Switch */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollList}>
            {banks.map(bank => (
              <View key={bank.id} style={styles.bankRow}>
                <View style={styles.bankLeft}>
                  <View style={[styles.bankColorDot, { backgroundColor: bank.color }]} />
                  <View>
                    <Text style={styles.bankName}>{bank.name}</Text>
                    <Text style={styles.bankPackage}>{bank.packageName}</Text>
                  </View>
                </View>

                <Switch
                  value={bank.isEnabled}
                  onValueChange={val => onToggleBank(bank.id, val)}
                  trackColor={{ false: '#1c2830', true: Colors.primaryMuted }}
                  thumbColor={bank.isEnabled ? Colors.primary : '#4b5b65'}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.doneBtn} activeOpacity={0.85} onPress={onClose}>
              <Text style={styles.doneBtnText}>CONCLUÍDO</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagLabel: { color: Colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  title: { color: Colors.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 2 },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: Colors.textSecondary, fontSize: 13 },
  description: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 16 },
  quickBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  counterText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  counterHighlight: { color: Colors.primary, fontWeight: '800' },
  quickButtons: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickBtnText: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  scrollList: { paddingBottom: 30 },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bankLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  bankColorDot: { width: 12, height: 12, borderRadius: 6 },
  bankName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  bankPackage: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  doneBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  doneBtnText: { color: '#000000', fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
});