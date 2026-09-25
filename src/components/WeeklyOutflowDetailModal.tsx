import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Rect, Line } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { useFinance } from '../context/FinanceContext';

interface WeeklyOutflowDetailModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WeeklyOutflowDetailModal({ visible, onClose }: WeeklyOutflowDetailModalProps) {
  const { weeklyData } = useFinance();

  const totalWeek = weeklyData.reduce((acc, d) => acc + d.amount, 0);
  const dailyAverage = totalWeek / 7;
  const peakDay = weeklyData.reduce((prev, curr) => (curr.amount > prev.amount ? curr : prev), weeklyData[0]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Toque fora para fechar */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.tagLabel}>PAINEL TEMPORAL</Text>
              <Text style={styles.title}>Fluxo Semanal Detalhado</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Métricas Reais da Semana */}
            <View style={styles.metricsBox}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>TOTAL SEMANAL</Text>
                <Text style={styles.metricValue}>
                  {totalWeek.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>MÉDIA / DIA</Text>
                <Text style={styles.averageValue}>
                  {dailyAverage.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>PICO DE GASTO</Text>
                <Text style={styles.peakValue}>{peakDay?.dayName || '-'}</Text>
              </View>
            </View>

            {/* Destaque do Pico */}
            {peakDay && peakDay.amount > 0 ? (
              <View style={styles.alertBanner}>
                <Text style={styles.alertText}>
                  Maior saída na <Text style={styles.alertHighlight}>{peakDay.dayName}</Text>:{' '}
                  {peakDay.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
            ) : null}

            {/* Gráfico de Barras com Escala */}
            <Text style={styles.sectionHeading}>DISTRIBUIÇÃO VISUAL POR DIA</Text>
            <View style={styles.chartExpandedCard}>
              <Svg width="100%" height="130" viewBox="0 0 315 130">
                <Line x1="10" y1="105" x2="305" y2="105" stroke="#1f2d37" strokeWidth="1" />
                <Line x1="10" y1="60" x2="305" y2="60" stroke="#1f2d37" strokeWidth="1" strokeDasharray="3 3" />
                <Line x1="10" y1="15" x2="305" y2="15" stroke="#1f2d37" strokeWidth="1" strokeDasharray="3 3" />

                {weeklyData.map((d, index) => {
                  const x = 18 + index * 42;
                  const barH = d.amount > 0 ? Math.max(10, Math.round((d.amount / (peakDay.amount || 1)) * 90)) : 8;
                  const y = 105 - barH;
                  const barColor = d.isPeak ? Colors.primary : '#1b2a32';
                  return (
                    <Rect
                      key={d.dayName}
                      x={x}
                      y={y}
                      width="20"
                      height={barH}
                      rx="4"
                      fill={barColor}
                    />
                  );
                })}
              </Svg>

              <View style={styles.daysLabelsRow}>
                {weeklyData.map(d => (
                  <Text key={d.dayName} style={[styles.dayLabel, d.isPeak && styles.dayLabelPeak]}>
                    {d.short}
                  </Text>
                ))}
              </View>
            </View>

            {/* Discriminação Dia a Dia */}
            <Text style={styles.sectionHeading}>DISCRIMINAÇÃO POR DIA DA SEMANA</Text>
            {weeklyData.map(d => (
              <View key={d.dayName} style={styles.dayRowCard}>
                <View style={styles.dayLeft}>
                  <View style={[styles.dayIndicator, d.isPeak && styles.dayIndicatorPeak]} />
                  <View>
                    <Text style={styles.dayName}>{d.dayName}</Text>
                    <Text style={styles.dayPercent}>{d.percentage}% do total da semana</Text>
                  </View>
                </View>
                <Text style={[styles.dayAmount, d.isPeak && styles.dayAmountPeak]}>
                  - {d.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </View>
            ))}

            <TouchableOpacity style={styles.dismissBtn} onPress={onClose}>
              <Text style={styles.dismissBtnText}>CONCLUÍDO</Text>
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
    backgroundColor: 'rgba(0,0,0,0.8)',
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
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
  scrollContent: { paddingBottom: 28 },
  metricsBox: {
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metricItem: { flex: 1 },
  metricLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  metricValue: { color: Colors.expense, fontSize: 13, fontWeight: '800' },
  averageValue: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800' },
  peakValue: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  alertBanner: {
    backgroundColor: 'rgba(198, 241, 53, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 12,
    alignItems: 'center',
  },
  alertText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '500' },
  alertHighlight: { color: Colors.primary, fontWeight: '800' },
  sectionHeading: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 10,
  },
  chartExpandedCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: 14,
  },
  daysLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 8,
  },
  dayLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
  dayLabelPeak: { color: Colors.primary, fontWeight: '800' },
  dayRowCard: {
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
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2a3a44' },
  dayIndicatorPeak: { backgroundColor: Colors.primary },
  dayName: { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  dayPercent: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  dayAmount: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  dayAmountPeak: { color: Colors.primary, fontWeight: '800' },
  dismissBtn: {
    backgroundColor: Colors.surfaceCard,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dismissBtnText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
});