import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function Onboarding() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Onboarding</Text>
      <Text style={styles.subtitle}>This is a placeholder. Replace with your onboarding flow.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F2F2' },
  title: { fontSize: 24, fontFamily: 'Poppins-SemiBold', color: '#2D2D2D', marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#64748B' },
});
