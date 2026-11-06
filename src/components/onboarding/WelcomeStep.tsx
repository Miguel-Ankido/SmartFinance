import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { Colors } from '../../theme/colors';

interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsação suave do badge principal
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, pulseAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Emblema central de boas-vindas com efeito neon */}
      <View style={styles.badgeWrapper}>
        <Animated.View style={[styles.glowRing, { transform: [{ scale: pulseAnim }] }]} />
        <View style={styles.iconCircle}>
          <Svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth="1.8">
            <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </View>

      {/* Títulos e Apresentação */}
      <View style={styles.headerBlock}>
        <View style={styles.tagBadge}>
          <Text style={styles.tagBadgeText}>BEM-VINDO AO FUTURO</Text>
        </View>
        <Text style={styles.mainTitle}>Bem-vindo ao SyncPay</Text>
        <Text style={styles.subtitle}>
          Vamos automatizar a sua vida financeira. Precisamos de apenas 2 minutos para configurar tudo.
        </Text>
      </View>

      {/* Cartões de Destaque das Features */}
      <View style={styles.cardsRow}>
        <View style={styles.featureCard}>
          <View style={styles.featureIconBox}>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth="2">
              <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </Svg>
          </View>
          <Text style={styles.featureTitle}>Captura Passiva</Text>
          <Text style={styles.featureDesc}>Lançamentos automáticos sem abrir o app.</Text>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIconBox}>
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth="2">
              <Rect x="2" y="4" width="20" height="16" rx="2" />
              <Path d="M6 8h12M6 12h6" />
            </Svg>
          </View>
          <Text style={styles.featureTitle}>Tetos e Limites</Text>
          <Text style={styles.featureDesc}>Alertas visuais para não estourar seu orçamento.</Text>
        </View>
      </View>

      {/* Botão de Ação */}
      <TouchableOpacity style={styles.actionButton} activeOpacity={0.85} onPress={onNext}>
        <Text style={styles.actionButtonText}>COMEÇAR CONFIGURAÇÃO →</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  badgeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  glowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(198, 241, 53, 0.12)',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 2,
    borderColor: 'rgba(198, 241, 53, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBlock: {
    alignItems: 'center',
    marginTop: 6,
  },
  tagBadge: {
    backgroundColor: 'rgba(198, 241, 53, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
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
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
    paddingHorizontal: 10,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 18,
  },
  featureCard: {
    flex: 1,
    backgroundColor: Colors.surfaceCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(198, 241, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  actionButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
