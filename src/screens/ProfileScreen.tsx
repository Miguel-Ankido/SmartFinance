import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';
import { useFinance } from '../context/FinanceContext';

export default function ProfileScreen() {
  const { hasPermission, requestPermission } = useFinance();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge} />
        <Text style={styles.profileName}>Amanda Silva</Text>
        <Text style={styles.profileEmail}>amanda.silva@financa.io</Text>
      </View>

      <Text style={styles.sectionHeader}>ACCOUNT SETTINGS</Text>

      <TouchableOpacity style={styles.menuItem} onPress={requestPermission}>
        <View>
          <Text style={styles.menuItemTitle}>Notifications</Text>
          <Text style={styles.menuItemSubtitle}>Captura em tempo real do Android</Text>
        </View>
        <Text style={[styles.statusBadge, hasPermission ? styles.badgeActive : styles.badgeInactive]}>
          {hasPermission ? 'Enabled' : 'Disabled'}
        </Text>
      </TouchableOpacity>

      <View style={styles.menuItem}>
        <Text style={styles.menuItemTitle}>Preferred Currency</Text>
        <Text style={styles.menuItemValue}>BRL (R$)</Text>
      </View>

      <View style={styles.menuItem}>
        <Text style={styles.menuItemTitle}>Linked Accounts</Text>
        <Text style={styles.menuItemValue}>Nubank, PicPay</Text>
      </View>

      <View style={styles.menuItem}>
        <Text style={styles.menuItemTitle}>Security & Passcode</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutText}>LOG OUT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  profileHeader: { alignItems: 'center', marginVertical: 20 },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ffffff', marginBottom: 12 },
  profileName: { color: Colors.textPrimary, fontSize: 20, fontWeight: '700' },
  profileEmail: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  sectionHeader: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginVertical: 14 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItemTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  menuItemSubtitle: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  menuItemValue: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  menuItemArrow: { color: Colors.textMuted, fontSize: 18 },
  statusBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeActive: { backgroundColor: '#132e1a', color: Colors.primary },
  badgeInactive: { backgroundColor: '#2d1416', color: Colors.expense },
  logoutButton: {
    marginTop: 20,
    backgroundColor: Colors.surfaceCard,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a1e22',
  },
  logoutText: { color: Colors.expense, fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
});