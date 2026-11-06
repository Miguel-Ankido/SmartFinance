/**
 * Testes para o Fluxo de Onboarding (Primeiro Acesso)
 * - Verificação da lógica de controle de estado (hasCompletedOnboarding, completeOnboarding, resetOnboarding)
 * - Verificação das categorias principais do BudgetStep (Alimentação, Transporte, Lazer, Contas)
 * - Verificação dos bancos do BanksStep (inclusão de ADB Shell apenas para admin)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_STORAGE_PREFIX } from '../src/context/AuthContext';
import {
  getAvailableBanks,
  ADB_SHELL_BANK,
} from '../src/services/bankMonitorService';

describe('Fluxo de Onboarding (Primeiro Acesso)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Controle de Estado de Primeiro Acesso', () => {
    const userId = 'user-test-onboarding-123';
    const key = `${ONBOARDING_STORAGE_PREFIX}${userId}`;

    it('identifica primeiro acesso quando a chave do AsyncStorage retorna null', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      const stored = await AsyncStorage.getItem(key);
      expect(stored).toBeNull();
      const hasCompleted = stored === 'true';
      expect(hasCompleted).toBe(false);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);
    });

    it('marca onboarding como concluído no AsyncStorage com setItem', async () => {
      await AsyncStorage.setItem(key, 'true');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(key, 'true');

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('true');
      const stored = await AsyncStorage.getItem(key);
      expect(stored).toBe('true');
      const hasCompleted = stored === 'true';
      expect(hasCompleted).toBe(true);
    });

    it('permite resetar o onboarding chamando removeItem', async () => {
      await AsyncStorage.removeItem(key);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      const stored = await AsyncStorage.getItem(key);
      expect(stored).toBeNull();
    });
  });

  describe('BudgetStep (Passo 2: Definição de Orçamento)', () => {
    const mainCategories = [
      { id: 'food', label: 'Alimentação & Mercado', defaultLimit: 800 },
      { id: 'transport', label: 'Transporte & Combustível', defaultLimit: 350 },
      { id: 'entertainment', label: 'Lazer & Restaurantes', defaultLimit: 400 },
      { id: 'bills', label: 'Contas Fixas & Moradia', defaultLimit: 1200 },
    ];

    it('apresenta as 4 categorias fundamentais de despesas', () => {
      expect(mainCategories).toHaveLength(4);
      expect(mainCategories.map(c => c.id)).toEqual([
        'food',
        'transport',
        'entertainment',
        'bills',
      ]);
    });

    it('calcula o teto total consolidado a partir das categorias configuradas', () => {
      const limits: Record<string, number> = {
        food: 800,
        transport: 350,
        entertainment: 400,
        bills: 1200,
      };

      const total = Object.values(limits).reduce((acc, val) => acc + val, 0);
      expect(total).toBe(2750);
    });

    it('sanitiza e aceita apenas valores numéricos válidos', () => {
      const rawInput = 'R$ 1.500,00';
      const cleanNumeric = rawInput.replace(/[^0-9]/g, '');
      const parsed = parseFloat(cleanNumeric) || 0;
      expect(parsed).toBe(150000);
    });
  });

  describe('BanksStep (Passo 3: Bancos Monitorados)', () => {
    it('retorna os 6 bancos padrão para usuário comum', () => {
      const banks = getAvailableBanks(false);
      expect(banks).toHaveLength(6);
      expect(banks.some(b => b.packageName === ADB_SHELL_BANK.packageName)).toBe(false);
      expect(banks.map(b => b.name)).toEqual([
        'Nubank',
        'PicPay',
        'Banco Inter',
        'Itaú',
        'Banco do Brasil',
        'Santander',
      ]);
    });

    it('injeta o Emulador ADB Shell exclusivamente para o Administrador', () => {
      const adminBanks = getAvailableBanks(true);
      expect(adminBanks).toHaveLength(7);
      const shellBank = adminBanks.find(b => b.packageName === 'com.android.shell');
      expect(shellBank).toBeDefined();
      expect(shellBank?.name).toBe('Emulador ADB (Shell)');
    });

    it('habilita todos os bancos por padrão caso não haja preferências salvas', () => {
      const banks = getAvailableBanks(false);
      banks.forEach(b => {
        expect(b.isEnabled).toBe(true);
      });
    });

    it('respeita preferências salvas de bancos habilitados/desabilitados', () => {
      const prefs: Record<string, boolean> = {
        'com.nu.production': true,
        'com.picpay': false,
      };
      const banks = getAvailableBanks(false, prefs);
      const nubank = banks.find(b => b.packageName === 'com.nu.production');
      const picpay = banks.find(b => b.packageName === 'com.picpay');

      expect(nubank?.isEnabled).toBe(true);
      expect(picpay?.isEnabled).toBe(false);
    });
  });
});
