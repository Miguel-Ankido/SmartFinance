import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import type { MonitoredBank } from '../types/finance';

export const STORAGE_KEY_MONITORED_BANKS = '@smartfinance:monitored_bank_settings';

export const SUPPORTED_BANKS: Omit<MonitoredBank, 'isEnabled'>[] = [
  {
    id: 'nubank',
    name: 'Nubank',
    packageName: 'com.nu.production',
    color: '#820AD1',
  },
  {
    id: 'picpay',
    name: 'PicPay',
    packageName: 'com.picpay',
    color: '#11C76F',
  },
  {
    id: 'inter',
    name: 'Banco Inter',
    packageName: 'br.com.intermedium',
    color: '#FF7A00',
  },
  {
    id: 'itau',
    name: 'Itaú',
    packageName: 'com.itau',
    color: '#EC7000',
  },
  {
    id: 'bb',
    name: 'Banco do Brasil',
    packageName: 'br.com.bb.android',
    color: '#F8D117',
  },
  {
    id: 'santander',
    name: 'Santander',
    packageName: 'br.com.santander.usuario',
    color: '#CC0000',
  },
];

export const ADB_SHELL_BANK: Omit<MonitoredBank, 'isEnabled'> = {
  id: 'shell',
  name: 'Emulador ADB (Shell)',
  packageName: 'com.android.shell',
  color: '#4CAF50',
};

/**
 * Retorna a lista completa de bancos disponíveis para o usuário.
 * Se o usuário for administrador, adiciona o item exclusivo "Emulador ADB (Shell)".
 */
export function getAvailableBanks(
  isAdmin = false,
  savedPreferences: Record<string, boolean> = {},
): MonitoredBank[] {
  const baseList: Omit<MonitoredBank, 'isEnabled'>[] = [...SUPPORTED_BANKS];

  if (isAdmin) {
    baseList.push(ADB_SHELL_BANK);
  }

  return baseList.map(bank => ({
    ...bank,
    isEnabled:
      savedPreferences[bank.packageName] !== undefined
        ? savedPreferences[bank.packageName]
        : true,
  }));
}

/**
 * Envia o array de pacotes ativos para o módulo nativo Android (NotificationModule.updateMonitoredPackages).
 */
export async function sendMonitoredPackagesToNative(
  activePackages: string[],
): Promise<boolean> {
  const notificationModule = NativeModules?.NotificationModule;
  if (Platform.OS === 'android' && notificationModule?.updateMonitoredPackages) {
    try {
      await notificationModule.updateMonitoredPackages(activePackages);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar pacotes monitorados no Android:', error);
      return false;
    }
  }
  return false;
}

/**
 * Salva as preferências de bancos monitorados no AsyncStorage e sincroniza com o módulo nativo.
 */
export async function saveAndSyncMonitoredBanks(
  banks: MonitoredBank[],
): Promise<string[]> {
  const preferences: Record<string, boolean> = {};
  const activePackages: string[] = [];

  banks.forEach(bank => {
    preferences[bank.packageName] = bank.isEnabled;
    if (bank.isEnabled) {
      activePackages.push(bank.packageName);
    }
  });

  try {
    await AsyncStorage.setItem(
      STORAGE_KEY_MONITORED_BANKS,
      JSON.stringify(preferences),
    );
  } catch (error) {
    console.error('Erro ao salvar preferências de bancos no AsyncStorage:', error);
  }

  await sendMonitoredPackagesToNative(activePackages);
  return activePackages;
}

/**
 * Lê as preferências guardadas localmente (AsyncStorage) e envia imediatamente
 * para o módulo nativo Android desde o carregamento da aplicação.
 */
export async function loadAndSyncMonitoredBanks(
  isAdmin = false,
): Promise<MonitoredBank[]> {
  let savedPreferences: Record<string, boolean> = {};

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_MONITORED_BANKS);
    if (raw) {
      savedPreferences = JSON.parse(raw);
    }
  } catch (error) {
    console.error('Erro ao carregar preferências de bancos do AsyncStorage:', error);
  }

  const banks = getAvailableBanks(isAdmin, savedPreferences);
  const activePackages = banks
    .filter(bank => bank.isEnabled)
    .map(bank => bank.packageName);

  await sendMonitoredPackagesToNative(activePackages);
  return banks;
}
