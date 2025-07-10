import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

const badges = [
  { id: '1', name: 'First Steps', description: 'Visited your first location.', image: 'https://cdn-icons-png.flaticon.com/512/2921/2921124.png' },
  { id: '2', name: 'Explorer', description: 'Visited 5 locations.', image: 'https://cdn-icons-png.flaticon.com/512/2921/2921124.png' },
  { id: '3', name: 'Adventurer', description: 'Visited 10 locations.', image: 'https://cdn-icons-png.flaticon.com/512/2921/2921124.png' },
  { id: '4', name: 'Historian', description: 'Visited a historical site.', image: 'https://cdn-icons-png.flaticon.com/512/2921/2921124.png' },
  { id: '5', name: 'Art Aficionado', description: 'Visited a museum.', image: 'https://cdn-icons-png.flaticon.com/512/2921/2921124.png' },
  { id: '6', name: 'Nature Lover', description: 'Visited a park or nature reserve.', image: 'https://cdn-icons-png.flaticon.com/512/2921/2921124.png' },
];

export default function BadgesScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#2c3e50', '#3498db']}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={46} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Badges</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {badges.map(badge => (
            <View key={badge.id} style={styles.badgeContainer}>
              <Image source={{ uri: badge.image }} style={styles.badgeImage} />
              <Text style={styles.badgeName}>{badge.name}</Text>
              <Text style={styles.badgeDescription}>{badge.description}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

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
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 16,
  },
  badgeContainer: {
    width: '45%',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  badgeImage: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
});
