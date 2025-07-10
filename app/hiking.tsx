import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronLeft } from 'lucide-react-native';

const hikingRoutes = [
  { id: '1', name: 'Historic Downtown Trail', distance: '3 km', difficulty: 'Easy' },
  { id: '2', name: 'River Valley Path', distance: '5 km', difficulty: 'Medium' },
  { id: '3', name: 'Mountain View Hike', distance: '8 km', difficulty: 'Hard' },
  { id: '4', name: 'Coastal Walk', distance: '6 km', difficulty: 'Medium' },
];

const HikingScreen = () => {
  const router = useRouter();

  const renderItem = ({ item }: { item: { id: string, name: string, distance: string, difficulty: string } }) => (
    <TouchableOpacity onPress={() => router.push('/hike-details')}>
      <BlurView intensity={80} tint="dark" style={styles.item}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.details}>{item.distance} | {item.difficulty}</Text>
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#2c3e50', '#3498db']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={46} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Hiking Routes</Text>
        </View>
        <FlatList
          data={hikingRoutes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          style={styles.list}
        />
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
  list: {
    marginHorizontal: 16,
  },
  item: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  name: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  details: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
});

export default HikingScreen;
