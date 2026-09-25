import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type TabBarIconProps = {
  label: string;
  active?: boolean;
};

export function TabBarIcon({ label, active = false }: TabBarIconProps) {
  return (
    <View style={[styles.container, active && styles.activeContainer]}>
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  activeContainer: {
    backgroundColor: '#E8F0FF',
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  activeLabel: {
    color: '#2F6FED',
  },
});
