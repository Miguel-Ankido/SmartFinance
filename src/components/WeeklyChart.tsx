import React from 'react';
import { View, StyleSheet } from 'react-native';

export function WeeklyChart() {
  const data = [42, 55, 38, 70, 60, 90, 65];

  return (
    <View style={styles.container}>
      {data.map((value, index) => (
        <View key={index} style={[styles.bar, { height: value }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 8,
  },
  bar: {
    flex: 1,
    backgroundColor: '#2F6FED',
    borderRadius: 8,
    minHeight: 24,
  },
});
