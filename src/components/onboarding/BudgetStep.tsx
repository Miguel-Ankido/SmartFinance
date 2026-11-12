import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { CategoryId } from '../../types/finance';
import { useFinance } from '../../context/FinanceContext';

interface BudgetStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface BudgetCategoryConfig {
  id: CategoryId;
  label: string;
  defaultLimit: number;
  color: string;
}

const MAIN_BUDGET_CATEGORIES: BudgetCategoryConfig[] = [
  { id: 'food', label: 'Alimentação & Mercado', defaultLimit: 800, color: Colors.catFood },
  { id: 'transport', label: 'Transporte & Combustível', defaultLimit: 350, color: Colors.catTransport },
  { id: 'entertainment', label: 'Lazer & Restaurantes', defaultLimit: 400, color: Colors.catEntertainment },
  { id: 'bills', label: 'Contas Fixas & Moradia', defaultLimit: 1200, color: Colors.catBills },
];

export default function BudgetStep({ onNext, onBack }: BudgetStepProps) {
  const { updateCategoryBudget, categories } = useFinance();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Estado dos limites digitados
  const [limits, setLimits] = useState<Record<CategoryId, string>>(() => {
    const initial: Record<string, string> = {};
    MAIN_BUDGET_CATEGORIES.forEach(cat => {
      const existing = categories.find(c => c.id === cat.id);
      const val = existing && existing.budgetLimit > 0 ? existing.budgetLimit : cat.defaultLimit;
      initial[cat.id] = String(val);
    });
    return initial as Record<CategoryId, string>;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleTextChange = (id: CategoryId, text: string) => {
    // Permite apenas números
    const clean = text.replace(/[^0-9]/g, '');
    setLimits(prev => ({ ...prev, [id]: clean }));
  };

  const handleContinue = async () => {
    try {
      setIsSubmitting(true);
      // Salva os limites configurados no SQLite local e dispara sync no Supabase
      for (const cat of MAIN_BUDGET_CATEGORIES) {
        const numericVal = parseFloat(limits[cat.id]) || cat.defaultLimit;
        await updateCategoryBudget(cat.id, numericVal);
      }
      onNext();
    } catch (e) {
      console.error('Erro ao salvar orçamentos no Onboarding:', e);
      onNext();
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCalculated = MAIN_BUDGET_CATEGORIES.reduce((acc, cat) => {
    const val = parseFloat(limits[cat.id]) || 0;
    return acc + val;
  }, 0);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cabeçalho do Passo */}
        <View style={styles.headerBlock}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagBadgeText}>PASSO 2 DE 3</Text>
          </View>
          <Text style={styles.mainTitle}>Defina os seus limites mensais</Text>
          <Text style={styles.subtitle}>
            Estipule um teto para as principais categorias para monitorar sua saúde financeira e receber alertas preventivos.
          </Text>
        </View>

        {/* Card do Total Previsto */}
        <View style={styles.totalSummaryCard}>
          <Text style={styles.totalLabel}>TETO TOTAL PREVISTO</Text>
          <Text style={styles.totalValue}>
            {totalCalculated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>

        {/* Inputs das Categorias */}
        <View style={styles.categoriesList}>
          {MAIN_BUDGET_CATEGORIES.map(cat => {
            return (
              <View key={cat.id} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryTitleRow}>
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.currencyPrefix}>R$</Text>
                  <TextInput
                    style={styles.limitInput}
                    keyboardType="number-pad"
                    value={limits[cat.id]}
                    onChangeText={text => handleTextChange(cat.id, text)}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <Text style={styles.monthSuffix}>/mês</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Botões de Navegação */}
      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={onBack}>
          <Text style={styles.backButtonText}>← VOLTAR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextButton, isSubmitting && styles.buttonDisabled]}
          activeOpacity={0.85}
          disabled={isSubmitting}
          onPress={handleContinue}>
          <Text style={styles.nextButtonText}>
            {isSubmitting ? 'A GUARDAR...' : 'CONTINUAR →'}
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
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
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
  totalSummaryCard: {
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  totalLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  totalValue: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  categoriesList: {
    gap: 12,
  },
  categoryItem: {
    backgroundColor: Colors.surfaceCard,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryLabel: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currencyPrefix: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
    marginRight: 6,
  },
  limitInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
  },
  monthSuffix: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
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
  nextButton: {
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
  nextButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
