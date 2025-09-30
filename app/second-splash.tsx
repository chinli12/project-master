import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function SecondSplash() {
  const router = useRouter();
  const translateY = useRef(new Animated.Value(16)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const start = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ]).start(() => {
        // Navigate to onboarding after another delay with smart-animate feel
        setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start(() => router.replace('/onboarding'));
        }, 800);
      });
    }, 800);

    return () => clearTimeout(start);
  }, [opacity, translateY, router]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Image
          source={require('../assets/images/splash logo.png')}
          style={styles.splashLogo}
          
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8CCF44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 240,
    height: 70,
  },
});
