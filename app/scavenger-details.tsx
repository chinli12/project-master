import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

const ScavengerDetailsScreen = () => {
  const router = useRouter();

  return (
    <LinearGradient colors={['#2c3e50', '#3498db']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={30} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Scavenger Hunt Details</Text>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <BlurView intensity={80} tint="dark" style={styles.detailsContainer}>
            <Text style={styles.name}>City Center Hunt</Text>
            <Text style={styles.description}>
              Find 5 landmarks in the city center. Take a picture of each one to complete the hunt.
            </Text>
          </BlurView>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 10,
    zIndex: 10,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    paddingHorizontal: 60, // Ensure title doesn't overlap button
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  detailsContainer: {
    padding: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    lineHeight: 24,
  },
});

export default ScavengerDetailsScreen;
