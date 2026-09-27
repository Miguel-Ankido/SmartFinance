import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { notificationBridge } from '../services/notificationBridge';
import { Colors } from '../theme/colors';

export const NotificationPermissionCard: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const checkStatus = useCallback(async () => {
    const granted = await notificationBridge.checkPermission();
    setHasPermission(granted);
  }, []);

  useEffect(() => {
    checkStatus();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkStatus();
      }
    });

    return () => subscription.remove();
  }, [checkStatus]);

  if (hasPermission !== false) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Captura automática desativada</Text>
        <Text style={styles.description}>
          Ative o acesso às notificações para sincronizar gastos de Nubank, PicPay e Inter.
        </Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Ativar acesso a notificações"
        style={styles.button}
        onPress={notificationBridge.openSettings}
        activeOpacity={0.8}>
        <Text style={styles.buttonText}>Ativar acesso</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.catShopping,
  },
  textContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#facc15',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#facc15',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 14,
  },
});
