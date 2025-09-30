
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function FirstSplash() {
  const router = useRouter();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    const start = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        router.replace('/second-splash');
      });
    }, 800);

    return () => clearTimeout(start);
  }, [opacity, scale, router]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <View style={styles.logoRow}>
          
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    width: 36,
    height: 36,
    marginRight: 8,
    tintColor: '#2D2D2D',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 24,
    color: '#2D2D2D',
    fontFamily: 'Poppins-SemiBold',
  },
});
