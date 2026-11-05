import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import {
  getAvailableBanks,
  sendMonitoredPackagesToNative,
  saveAndSyncMonitoredBanks,
  loadAndSyncMonitoredBanks,
  STORAGE_KEY_MONITORED_BANKS,
} from '../src/services/bankMonitorService';

describe('bankMonitorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAvailableBanks', () => {
    it('returns the 6 supported banks for non-admin users without shell', () => {
      const banks = getAvailableBanks(false);

      expect(banks).toHaveLength(6);
      expect(banks.map(b => b.packageName)).toEqual([
        'com.nu.production',
        'com.picpay',
        'br.com.intermedium',
        'com.itau',
        'br.com.bb.android',
        'br.com.santander.usuario',
      ]);
      expect(banks.some(b => b.packageName === 'com.android.shell')).toBe(false);
      expect(banks.every(b => b.isEnabled)).toBe(true);
    });

    it('injects "Emulador ADB (Shell)" with com.android.shell when isAdmin is true', () => {
      const banks = getAvailableBanks(true);

      expect(banks).toHaveLength(7);
      const shellBank = banks.find(b => b.packageName === 'com.android.shell');
      expect(shellBank).toBeDefined();
      expect(shellBank?.name).toBe('Emulador ADB (Shell)');
      expect(shellBank?.id).toBe('shell');
    });

    it('applies saved preferences to bank enabled status', () => {
      const preferences = {
        'com.nu.production': false,
        'com.picpay': true,
        'com.itau': false,
      };

      const banks = getAvailableBanks(false, preferences);
      const nu = banks.find(b => b.packageName === 'com.nu.production');
      const picpay = banks.find(b => b.packageName === 'com.picpay');
      const itau = banks.find(b => b.packageName === 'com.itau');
      const inter = banks.find(b => b.packageName === 'br.com.intermedium');

      expect(nu?.isEnabled).toBe(false);
      expect(picpay?.isEnabled).toBe(true);
      expect(itau?.isEnabled).toBe(false);
      expect(inter?.isEnabled).toBe(true); // default when not in prefs
    });
  });

  describe('sendMonitoredPackagesToNative', () => {
    it('calls NativeModules.NotificationModule.updateMonitoredPackages on Android', async () => {
      Platform.OS = 'android';
      NativeModules.NotificationModule = {
        updateMonitoredPackages: jest.fn().mockResolvedValue(true),
      };

      const packages = ['com.nu.production', 'com.picpay'];
      const result = await sendMonitoredPackagesToNative(packages);

      expect(result).toBe(true);
      expect(NativeModules.NotificationModule.updateMonitoredPackages).toHaveBeenCalledWith(
        packages,
      );
    });
  });

  describe('saveAndSyncMonitoredBanks', () => {
    it('saves preferences in AsyncStorage and calls native module with active packages only', async () => {
      Platform.OS = 'android';
      const mockUpdate = jest.fn().mockResolvedValue(true);
      NativeModules.NotificationModule = {
        updateMonitoredPackages: mockUpdate,
      };

      const testBanks = [
        { id: 'nubank', name: 'Nubank', packageName: 'com.nu.production', isEnabled: true, color: '#820AD1' },
        { id: 'picpay', name: 'PicPay', packageName: 'com.picpay', isEnabled: false, color: '#11C76F' },
        { id: 'itau', name: 'Itaú', packageName: 'com.itau', isEnabled: true, color: '#EC7000' },
      ];

      const activePackages = await saveAndSyncMonitoredBanks(testBanks);

      expect(activePackages).toEqual(['com.nu.production', 'com.itau']);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY_MONITORED_BANKS,
        JSON.stringify({
          'com.nu.production': true,
          'com.picpay': false,
          'com.itau': true,
        }),
      );
      expect(mockUpdate).toHaveBeenCalledWith(['com.nu.production', 'com.itau']);
    });
  });

  describe('loadAndSyncMonitoredBanks', () => {
    it('reads preferences from AsyncStorage and updates native module', async () => {
      Platform.OS = 'android';
      const mockUpdate = jest.fn().mockResolvedValue(true);
      NativeModules.NotificationModule = {
        updateMonitoredPackages: mockUpdate,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({
          'com.nu.production': true,
          'com.picpay': false,
        }),
      );

      const banks = await loadAndSyncMonitoredBanks(false);

      expect(banks).toHaveLength(6);
      const nu = banks.find(b => b.packageName === 'com.nu.production');
      const picpay = banks.find(b => b.packageName === 'com.picpay');
      expect(nu?.isEnabled).toBe(true);
      expect(picpay?.isEnabled).toBe(false);

      expect(mockUpdate).toHaveBeenCalled();
      const calledPackages: string[] = mockUpdate.mock.calls[0][0];
      expect(calledPackages).toContain('com.nu.production');
      expect(calledPackages).not.toContain('com.picpay');
    });
  });
});
