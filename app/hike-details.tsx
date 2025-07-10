import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

const HikeDetailsScreen = () => {
  const router = useRouter();

  return (
    <LinearGradient colors={['#2c3e50', '#3498db']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={46} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Hike Details</Text>
        </View>
        <BlurView intensity={80} tint="dark" style={styles.detailsContainer}>
          <Text style={styles.name}>Historic Downtown Trail</Text>
          <Text style={styles.details}>Distance: 3 km</Text>
          <Text style={styles.details}>Difficulty: Easy</Text>
          <Text style={styles.description}>
            A beautiful walk through the historic downtown, passing by several landmarks and old buildings.
          </Text>
        </BlurView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    position: 'absolute',
    left: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  detailsContainer: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 10,
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
  details: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    marginTop: 10,
    lineHeight: 24,
  },
});

export default HikeDetailsScreen;
