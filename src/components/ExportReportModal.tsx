import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  NativeModules,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Transaction, TransactionType } from '../types/finance';
import { generateTransactionsCsv } from '../utils/csvExporter';

const { NotificationModule } = NativeModules;

interface ExportReportModalProps {
  visible: boolean;
  transactions: Transaction[];
  userName?: string;
  onClose: () => void;
}

type PeriodFilter = 'CURRENT_MONTH' | 'LAST_3_MONTHS' | 'ALL';

export default function ExportReportModal({
  visible,
  transactions,
  userName,
  onClose,
}: ExportReportModalProps) {
  const [period, setPeriod] = useState<PeriodFilter>('CURRENT_MONTH');
  const [typeFilter, setTypeFilter] = useState<'ALL' | TransactionType>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Filtragem dos registros
  const filteredList = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1).getTime();

    return transactions.filter(t => {
      const tDate = new Date(t.timestamp);

      let matchesPeriod = true;
      if (period === 'CURRENT_MONTH') {
        matchesPeriod = tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
      } else if (period === 'LAST_3_MONTHS') {
        matchesPeriod = t.timestamp >= threeMonthsAgo;
      }

      const matchesType = typeFilter === 'ALL' || t.type === typeFilter;
      return matchesPeriod && matchesType;
    });
  }, [transactions, period, typeFilter]);

  const totalIn = filteredList
    .filter(t => t.type === 'INCOME')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalOut = filteredList
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + t.amount, 0);

  const netBalance = totalIn - totalOut;

  const fileName = useMemo(() => {
    const now = new Date();
    const tag = period === 'CURRENT_MONTH'
      ? `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`
      : period === 'LAST_3_MONTHS'
      ? 'ultimos_3_meses'
      : 'completo';
    return `SmartFinance_Extrato_${tag}.csv`;
  }, [period]);

  const handleShare = async () => {
    if (filteredList.length === 0) {
      Alert.alert('Aviso', 'Não há movimentações para exportar com os filtros selecionados.');
      return;
    }

    try {
      const csvData = generateTransactionsCsv(filteredList, userName);
      await Share.share({
        title: fileName,
        message: csvData,
      });
    } catch (e: any) {
      Alert.alert('Erro ao compartilhar', e.message || 'Falha no envio.');
    }
  };

  const handleSaveToDevice = async () => {
    if (filteredList.length === 0) {
      Alert.alert('Aviso', 'Não há movimentações para exportar com os filtros selecionados.');
      return;
    }

    setIsExporting(true);
    try {
      const csvData = generateTransactionsCsv(filteredList, userName);
      if (NotificationModule?.saveCsvToDownloads) {
        const savedPath: string = await NotificationModule.saveCsvToDownloads(fileName, csvData);
        Alert.alert(
          'Exportação Concluída! 📁',
          `Seu arquivo foi salvo com sucesso em:\n${savedPath}\n\nCompatível com Microsoft Excel, Planilhas Google e Numbers.`,
          [{ text: 'OK' }]
        );
      } else {
        // Fallback para o Share Sheet caso o módulo nativo não esteja presente
        await Share.share({ title: fileName, message: csvData });
      }
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e.message || 'Não foi possível gravar o arquivo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.tagLabel}>RELATÓRIOS E DADOS</Text>
              <Text style={styles.title}>Exportar Extrato</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Gere uma planilha organizada em formato CSV para conferir seus lançamentos ou importar no Excel.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Filtro de Período */}
            <Text style={styles.sectionHeading}>PERÍODO DE COMPETÊNCIA</Text>
            <View style={styles.pillsGroup}>
              <TouchableOpacity
                style={[styles.filterChip, period === 'CURRENT_MONTH' && styles.filterChipActive]}
                onPress={() => setPeriod('CURRENT_MONTH')}>
                <Text style={[styles.filterChipText, period === 'CURRENT_MONTH' && styles.filterChipTextActive]}>
                  Mês Atual
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, period === 'LAST_3_MONTHS' && styles.filterChipActive]}
                onPress={() => setPeriod('LAST_3_MONTHS')}>
                <Text style={[styles.filterChipText, period === 'LAST_3_MONTHS' && styles.filterChipTextActive]}>
                  Últimos 3 Meses
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, period === 'ALL' && styles.filterChipActive]}
                onPress={() => setPeriod('ALL')}>
                <Text style={[styles.filterChipText, period === 'ALL' && styles.filterChipTextActive]}>
                  Todo o Histórico
                </Text>
              </TouchableOpacity>
            </View>

            {/* Filtro por Tipo */}
            <Text style={styles.sectionHeading}>TIPO DE MOVIMENTAÇÃO</Text>
            <View style={styles.pillsGroup}>
              <TouchableOpacity
                style={[styles.filterChip, typeFilter === 'ALL' && styles.filterChipActive]}
                onPress={() => setTypeFilter('ALL')}>
                <Text style={[styles.filterChipText, typeFilter === 'ALL' && styles.filterChipTextActive]}>
                  Todas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, typeFilter === 'EXPENSE' && styles.filterChipActive]}
                onPress={() => setTypeFilter('EXPENSE')}>
                <Text style={[styles.filterChipText, typeFilter === 'EXPENSE' && styles.filterChipTextActive]}>
                  Apenas Saídas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, typeFilter === 'INCOME' && styles.filterChipActive]}
                onPress={() => setTypeFilter('INCOME')}>
                <Text style={[styles.filterChipText, typeFilter === 'INCOME' && styles.filterChipTextActive]}>
                  Apenas Entradas
                </Text>
              </TouchableOpacity>
            </View>

            {/* Prévia do Extrato a Exportar */}
            <View style={styles.previewBox}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>PRÉVIA DA SELEÇÃO</Text>
                <Text style={styles.countBadge}>{filteredList.length} registros</Text>
              </View>

              <View style={styles.previewStatsRow}>
                <View style={styles.previewStat}>
                  <Text style={styles.statLabel}>ENTRADAS</Text>
                  <Text style={styles.statIncome}>
                    + {totalIn.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </View>

                <View style={styles.previewStat}>
                  <Text style={styles.statLabel}>SAÍDAS</Text>
                  <Text style={styles.statExpense}>
                    - {totalOut.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </View>

                <View style={styles.previewStat}>
                  <Text style={styles.statLabel}>BALANÇO</Text>
                  <Text style={[styles.statBalance, netBalance >= 0 ? styles.statIncome : styles.statExpense]}>
                    {netBalance >= 0 ? '+ ' : '- '}
                    {Math.abs(netBalance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </View>
              </View>

              <View style={styles.fileTargetBox}>
                <Text style={styles.fileTargetText}>📄 {fileName}</Text>
              </View>
            </View>

            {/* Botões de Ação */}
            <TouchableOpacity
              style={styles.primaryActionBtn}
              activeOpacity={0.85}
              disabled={isExporting}
              onPress={handleSaveToDevice}>
              {isExporting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.primaryActionBtnText}>💾 SALVAR NA PASTA DOWNLOADS</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              activeOpacity={0.85}
              onPress={handleShare}>
              <Text style={styles.secondaryActionBtnText}>📤 COMPARTILHAR EXTRATO</Text>
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
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
  scrollBody: { paddingBottom: 32 },
  sectionHeading: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 6,
  },
  pillsGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  filterChip: {
    backgroundColor: Colors.surfaceCard,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  filterChipTextActive: { color: '#000000', fontWeight: '800' },
  previewBox: {
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: { color: Colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  countBadge: {
    backgroundColor: 'rgba(198, 241, 53, 0.12)',
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  previewStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  previewStat: { flex: 1 },
  statLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', marginBottom: 4 },
  statIncome: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  statExpense: { color: Colors.expense, fontSize: 13, fontWeight: '800' },
  statBalance: { fontSize: 13, fontWeight: '800' },
  fileTargetBox: {
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  fileTargetText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  primaryActionBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryActionBtnText: { color: '#000000', fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  secondaryActionBtn: {
    backgroundColor: Colors.surfaceCard,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryActionBtnText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
});