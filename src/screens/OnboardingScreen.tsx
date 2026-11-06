import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import WelcomeStep from '../components/onboarding/WelcomeStep';
import BudgetStep from '../components/onboarding/BudgetStep';
import BanksStep from '../components/onboarding/BanksStep';

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

  const [currentStep, setCurrentStep] = useState(0);

  // Animação de transição horizontal entre passos
  const slideAnim = useRef(new Animated.Value(0)).current;
  // Animação de fade global (usada no fade-out final)
  const fadeOutAnim = useRef(new Animated.Value(1)).current;

  const goToStep = (stepIndex: number) => {
    Animated.timing(slideAnim, {
      toValue: -stepIndex * screenWidth,
      duration: 380,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(stepIndex);
    });
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      goToStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    // Fade out suave antes de transitar para a Home com Dashboard
    Animated.timing(fadeOutAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(async () => {
      await completeOnboarding();
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeOutAnim }]}>
      <StatusBar barStyle="light-content" />

      {/* Elementos Geométricos Animados no Fundo */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="neonGlow1" cx="20%" cy="15%" r="50%">
              <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.12" />
              <Stop offset="100%" stopColor="#070b0e" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="neonGlow2" cx="80%" cy="85%" r="45%">
              <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.08" />
              <Stop offset="100%" stopColor="#070b0e" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="20%" cy="15%" r="220" fill="url(#neonGlow1)" />
          <Circle cx="80%" cy="85%" r="200" fill="url(#neonGlow2)" />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Carrossel Horizontal Animado dos Passos */}
        <View style={styles.carouselWrapper}>
          <Animated.View
            style={[
              styles.stepsSlider,
              {
                width: screenWidth * TOTAL_STEPS,
                transform: [{ translateX: slideAnim }],
              },
            ]}>
            <View style={{ width: screenWidth, flex: 1 }}>
              <WelcomeStep onNext={handleNext} />
            </View>

            <View style={{ width: screenWidth, flex: 1 }}>
              <BudgetStep onNext={handleNext} onBack={handleBack} />
            </View>

            <View style={{ width: screenWidth, flex: 1 }}>
              <BanksStep onBack={handleBack} onFinish={handleFinish} />
            </View>
          </Animated.View>
        </View>

        {/* Paginador com Indicadores no Rodapé */}
        <View style={styles.paginationContainer}>
          {[0, 1, 2].map(idx => {
            const isActive = currentStep === idx;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b0e',
  },
  safeArea: {
    flex: 1,
  },
  carouselWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  stepsSlider: {
    flex: 1,
    flexDirection: 'row',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: '#1f2d37',
  },
});
